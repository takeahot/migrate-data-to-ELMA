// backend/casaviToElma.js

const { logWriter, makeReq, authentication, generateCSV, createDataFile, uploadFile, importData } = require('./common');

async function storageDataFromELMA() {
    let elmaData = {
        ELMAProperties: [],
        ELMAUnits: [],
        ELMAContacts: []
    }

    async function lambda() {
        if (Object.keys(elmaData).find(items => elmaData[items].length === 0)) {
            let ELMAProperties = (await makeReq('getPropertyList', ELMAconf.token, '?query={"size": 10000}', 'ELMA')).result.result.filter(el => el.__deletedAt === null);
            logWriter('count of ELMAProperties - ' + ELMAProperties.length)
            let ELMAUnits = (await makeReq('getUnitList', ELMAconf.token, '?query={"size": 10000}', 'ELMA')).result.result.filter(el => el.__deletedAt === null);
            logWriter('count of ELMAUnits - ' + ELMAUnits.length)
            let ELMAContacts = (await makeReq('getContactList', ELMAconf.token, '?query={"size": 10000}', 'ELMA')).result.result.filter(el => el.__deletedAt === undefined || el.__deletedAt === null);
            logWriter('count of ELMAContacts - ' + ELMAContacts.length)
            elmaData = {
                ELMAProperties,
                ELMAUnits,
                ELMAContacts,
            };
            return elmaData;
        } else {
            return elmaData;
        }
    }
    return lambda;
}

async function resolveELMAId(typeOfElement, nameOfIdElementInELMAFromCasavi, id) {
    if (!['ELMAProperties', 'ELMAUnits', 'ELMAContacts'].includes(typeOfElement)) {
        console.log('typeOfElement is incorrect. Need to be one of ELMAProperties, ELMAUnits, ELMAContacts')
        return;
    }
    ELMAElements = (await getDataFromELMA())[typeOfElement];
    logWriter('nameOfIdElementInELMAFromCasavi - ' + nameOfIdElementInELMAFromCasavi);
    logWriter(' id ' + id + '; type of id ' + typeof id);

    let ELMAElem = ELMAElements.find(elem => elem[nameOfIdElementInELMAFromCasavi] === id);
    return ELMAElem && ELMAElem.__id
}

async function getAllElementsFromCasavi(typeOfData) {
    let token = await authentication();
    let nextPage = 1;
    let next = 'someAddressWillBeReplacedFromSystem';
    let listOfElements = [];
    while (next) {
        let dataContainListOfElements = await makeReq('get' + typeOfData + 'List', token, '?page=' + nextPage++);
        logWriter('getAllElementsFromCasavi ' + typeOfData + ' nextPage - ' + nextPage);
        console.log('getAllElementsFromCasavi ' + typeOfData + ' nextPage - ', nextPage);
        next = dataContainListOfElements._links.next;
        listOfElements = listOfElements.concat(dataContainListOfElements.list);
    }
    return listOfElements;
}

async function enrichTheData(listOfContact) {
    async function resolveListOfELMAIds(typeOfElement, nameOfIdElementInELMAFromCasavi, ids) {
        let ELMAElemIdsPromises = ids.map(async elemId => await resolveELMAId(typeOfElement, nameOfIdElementInELMAFromCasavi, elemId));
        let ELMAElemIds = await Promise.all(ELMAElemIdsPromises);
        ELMAElemIds = ELMAElemIds.filter(propId => propId);
        return ELMAElemIds;
    };
    listOfContact = listOfContact.map(
        async contact => {
            let propertyELMAIds = await resolveListOfELMAIds(
                'ELMAProperties',
                'property_id',
                contact.contracts.map(contract => contract.propertyId)
            );
            let unitELMAIds = await resolveListOfELMAIds(
                'ELMAUnits',
                'unit_id',
                contact.contracts.map(contract => contract.unitId)
            );
            return Object.assign(
                {},
                contact,
                contact.customFields,
                {
                    'start_not_accord_contracts': contact.contracts
                        .map(contract => contract.startDate)
                        .sort((a, b) => a === null ? b === null ? 0 : -1 : b === null ? 1 : a - b),
                    'end_not_accrod_contracts': contact.contracts
                        .map(contract => contract.endDate)
                        .sort((a, b) => a === null ? b === null ? 0 : -1 : b === null ? 1 : a - b),
                    'property': propertyELMAIds,
                    'unit': unitELMAIds,
                    'Identifier [__id]': resolveELMAId('ELMAContacts', 'contact_id', contact.id)
                },
            );
        }
    );
    return await Promise.all(listOfContact);
}

async function generateRequestParam(contact) {
    logWriter('generateRequestParam - contact - ' + JSON.stringify(contact));
    let bodyOfQueryCreateElmaTicket = {
        "context": {},
        "withEventForceCreate": false,
    };
    for (const key of Object.keys(contact)) {
        logWriter('key - ' + key);
        let keyObj = mappingCasaviELMA.find(keyObj => keyObj.keyCasavi === key);
        if (!keyObj) continue;
        if (!contact[key]) continue;
        let kEArray = (!keyObj.keyELMA.map && [keyObj.keyELMA] || keyObj.keyELMA);
        for (let i = 0; i < kEArray.length; i++) {
            let kE = kEArray[i];
            logWriter('kE - ' + kE);
            let copyOfContext = Object.assign({}, bodyOfQueryCreateElmaTicket.context);
            let func = keyObj.func
                && (!keyObj.func.map
                    && keyObj.func
                    || keyObj.func[i])
                || undefined;
            if (kE.split('.').length < 1) return;
            if (kE.split('.').length === 1) {
                if (kE.slice(-2) !== '[]') {
                    logWriter('is primitive');
                    copyOfContext[kE] = !func ? contact[key] : await func(contact[key]);
                    logWriter('copyOfContext[kE] - ' + JSON.stringify(copyOfContext[kE]));
                } else {
                    let funcResult = await func(contact[key]);
                    logWriter('is array');
                    if (func && (!funcResult || funcResult.map && !funcResult[0])) continue;
                    if (!copyOfContext[kE.slice(0, -2)]) copyOfContext[kE.slice(0, -2)] = [];
                    copyOfContext[kE.slice(0, -2)] =
                        copyOfContext[kE.slice(0, -2)]
                            .concat(!func ? JSON.parse(contact[key]) : funcResult);
                    logWriter('copyOfContext[kE.slice(0, -2)] - ' + JSON.stringify(copyOfContext[kE.slice(0, -2)]));
                }
            } else {
                logWriter('is object');
                let valueFromCasavi = !func ? contact[key] : await func(contact[key]);
                if (!valueFromCasavi) continue;
                kE.split('.').reduce(
                    (acc, partOfELMAKey) => {
                        if (!acc.lastKey) {
                            acc.lastKey = partOfELMAKey;
                            return acc;
                        }
                        if (typeof acc.obj[acc.lastKey] !== 'object') acc.obj[acc.lastKey] = {};
                        acc.obj = acc.obj[acc.lastKey];
                        acc.lastKey = partOfELMAKey;
                        acc.obj[partOfELMAKey] = valueFromCasavi;
                        return acc;
                    }
                    , { obj: copyOfContext, lastKey: '' }
                );
                logWriter('copyOfContext[kE.split(".")[0]] - ' + JSON.stringify(copyOfContext[kE.split(".")[0]]));
            }
            bodyOfQueryCreateElmaTicket.context = copyOfContext;
        }
    }
    let ELMAContactId = undefined;
    if (contact.id) {
        ELMAContactId = await resolveELMAId('ELMAContacts', 'contact_id', contact.id);
    }
    if (!ELMAContactId) {
        logWriter('contact.id not found in ElMA - ' + contact.id);
    }
    logWriter('request body - ' + bodyOfQueryCreateElmaTicket);
    if (ELMAContactId) {
        return ['updateContact', ELMAconf.token, Object.assign({}, bodyOfQueryCreateElmaTicket), 'ELMA', ELMAContactId];
    } else {
        return ['createContact', ELMAconf.token, Object.assign({}, bodyOfQueryCreateElmaTicket), "ELMA"];
    }
}

async function generateAndMakeRequest(contact, latency) {
    let requestParam = await generateRequestParam(contact);
    console.log('requestParam - ', requestParam);
    let reqPromise = new Promise(function (resolve, reject) {
        setTimeout(async () => { resolve(await makeReq(...requestParam)) }, latency);
    });
    let res = await reqPromise;
    if (typeof res !== 'object') {
        res = [res].fill("", 1, 4);
        for (const attempt of res) {
            if (attempt) continue;
            res.push(await reqPromise);
            if (typeof res[res.length - 1] === 'object') {
                break;
            }
        }
    }
    return res;
}

// Экспорт функций
module.exports = {
    storageDataFromELMA,
    resolveELMAId,
    getAllElementsFromCasavi,
    enrichTheData,
    generateRequestParam,
    generateAndMakeRequest,
};

