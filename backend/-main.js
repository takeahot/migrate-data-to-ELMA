// backend/main.js

const readline = require('readline');
const fetch = require('node-fetch'); // Импортируем fetch для выполнения HTTP запросов
const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');

console.log('start script');
let timeStart = new Date();

function logWriter(text) {
    fs.writeFileSync(timeStart.toString() + '.txt',
        new Date().toString() + text + "\n",
        { flag: 'a' },
        err => {
            if (err) {
                console.error(err);
            } else {
                // file written successfully
            }
        });
}

// Переместите код, который вы хотите выполнить непосредственно, в функцию или за пределы области видимости модуля
function startScript() {
    // Исполняемый код, который не должен быть выполнен при импорте модуля
    waitForUserInput();
    main();
}

const conf = {
    serverAddress: 'https://api.mycasavi.com/',
    auth: {
        command: 'v2/authenticate',
        method: 'POST',
        predefinedData: {
            'key': '2f40f9c0-81a0-4702-8cce-4e8e188245a5',
            'secret': 'fe84c7b2-25b0-4320-a868-b24724fe1295'
        }
    },
    getContactList: {
        command: 'v2/contacts',
    },
    getUnitList: {
        command: 'v2/units',
    }
}

const ELMAconf = {
    serverAddress: 'https://7isfa26wfvp4a.elma365.eu/pub/v1/',
    auth: {
        command: 'v2/authenticate',
        method: 'POST',
        predefinedData: {
            'key': '2f40f9c0-81a0-4702-8cce-4e8e188245a5',
            'secret': 'fe84c7b2-25b0-4320-a868-b24724fe1295'
        }
    },
    getPropertyList: {
        command: 'app/customertest/properties/list',
    },
    getUnitList: {
        command: 'app/customertest/units/list',
    },
    getContactList: {
        command: 'app/customertest/contacts/list'
    },
    updateContact: {
        command: 'app/customertest/contacts/{id}/update',
        method: 'POST',
    },
    createContact: {
        command: 'app/customertest/contacts/create',
        method: 'POST'
    },
    token: '261d9f7c-fa92-42c8-9499-a8ae664c8f36',
}

let mappingCasaviELMA = [
    {
        keyCasavi: 'firstName',
        keyELMA: 'full_name.firstname',
    },
    {
        keyCasavi: 'lastName',
        keyELMA: 'full_name.lastname'
    },
    {
        keyCasavi: 'id',
        keyELMA: 'contact_id',
    },
    {
        keyCasavi: 'companyName',
        keyELMA: 'company_name',
    },
    {
        keyCasavi: 'telephone',
        keyELMA: 'phone_number[]',
        func: (dataFromCasavi) => {
            return {
                'type': 'main',
                'tel': dataFromCasavi
            }
        }
    },
    {
        keyCasavi: 'mobile',
        keyELMA: 'phone_number[]',
        func: (dataFromCasavi) => {
            return {
                'type': 'mobile',
                'tel': dataFromCasavi
            }
        }
    },
    {
        keyCasavi: 'email',
        keyELMA: 'email_address[]',
        func: (dataFromCasavi) => {
            return {
                "type": "main",
                "email": dataFromCasavi
            }
        }
    },
    {
        keyCasavi: 'contracts',
        keyELMA: ['category[]', 'property[]', 'unit[]'],
        func: [
            (dataFromCasavi) => {
                let dictionary = {
                    'OWNER': {
                        "code": "owner",
                        "name": "Owner"
                    },
                    "RENTER": {
                        "code": "tenant",
                        "name": "Tenant"
                    }
                }
                let keyOfDictionary = dataFromCasavi.find(contract => contract.type && contract.type !== null)
                return keyOfDictionary ? dictionary[keyOfDictionary.type] : { "code": "other", "name": "Other" };
            },
            async (dataFromCasavi) => {
                let contractPropertyIdsPromises = dataFromCasavi
                    .map(contract => contract.propertyId)
                    .map(async propId => await resolveELMAId('ELMAProperties', 'property_id', propId))
                let contractPropertyIds = await Promise.all(contractPropertyIdsPromises);
                contractPropertyIds = contractPropertyIds.filter(propId => propId);
                return contractPropertyIds;
            },
            async (dataFromCasavi) => {
                let contractUnitIdsPromises = dataFromCasavi
                    .map(contract => contract.unitId)
                    .map(async unitId => await resolveELMAId('ELMAUnits', 'unit_id', unitId))
                let contractUnitIds = await Promise.all(contractUnitIdsPromises);
                contractUnitIds = contractUnitIds.filter(unitId => unitId);
                return contractUnitIds
            }
        ]
    },
    {
        keyCasavi: 'customFields',
        keyELMA: ['email_address[]', 'phone_number[]', 'phone_number[]'],
        func: [
            (dataFromCasavi) => {
                if (!dataFromCasavi['E-Mail 2']) return
                return {
                    "type": "work",
                    "email": dataFromCasavi['E-Mail 2']
                }
            },
            (dataFromCasavi) => {
                if (!dataFromCasavi['Mobiltelefon 2']) return
                return {
                    'type': 'work',
                    'tel': dataFromCasavi['Mobiltelefon 2']
                }
            },
            (dataFromCasavi) => {
                if (!dataFromCasavi['Telefon 2']) return
                return {
                    'type': 'home',
                    'tel': dataFromCasavi['Telefon 2']
                }
            },
        ]
    },
    {
        keyCasavi: 'country',
        keyELMA: 'contact_country',
    },
    {
        keyCasavi: 'city',
        keyELMA: 'contact_city',
    },
    {
        keyCasavi: 'street',
        keyELMA: 'contact_street',
    },
    {
        keyCasavi: 'postalCode',
        keyELMA: 'contact_zip',
    },
    {
        keyCasavi: 'appLink',
        keyELMA: 'contact_applink',
    },
]

async function makeReq(command, token, body, source, id) {
    let reqConfig;
    if (source === "ELMA") {
        reqConfig = ELMAconf;
    } else {
        reqConfig = conf;
    }
    let reqURL =
        reqConfig.serverAddress +
        (!id && reqConfig[command].command || reqConfig[command].command.replace(/{.*}/g, id)) +
        ((!reqConfig[command].method || reqConfig[command].method === "GET") && body || '')
    let reqObj = Object.assign(
        {},
        {
            method: reqConfig[command].method || 'GET',
            headers: Object.assign(
                {},
                {
                    "Content-Type": "application/json"
                },
                token && (source === 'ELMA' && { "Authorization": "Bearer " + token } || { 'token': token })
            )
        },
        (reqConfig[command].method && reqConfig[command].method !== 'GET') && (reqConfig[command].predefinedData || body) && {
            body: JSON.stringify(Object.assign(
                {},
                reqConfig[command].predefinedData && reqConfig[command].predefinedData,
                reqConfig[command].method && reqConfig[command].method !== "GET" && body
            ))
        }
    )
    console.log(reqURL);
    logWriter(reqURL);
    console.log(reqObj);
    logWriter(JSON.stringify(reqObj, null, 2));
    let response;
    try {
        response = await fetch(
            reqURL,
            reqObj
        )
    } catch (err) {
        return 'err.code - ' + err.code + 'err.message - ' + err.message + 'JSON.stringify - ' + JSON.stringify(err)
    }
    if (response.status >= 200 && response.status < 300) {
        let summary = await response.json()
        return summary;
    } else {
        return response.status + " -- " + response.statusText + " request url - " + reqURL;
    }
}

async function authentication() {
    let authData = await makeReq('auth');
    let token = authData.token;
    return token;
}

function generateCSV(name, data) {
    let listOfKey = data
        .reduce((acc, elementOfData) => acc
            .concat(
                Object
                    .keys(elementOfData)
                    .reduce(
                        (uniqueKey, key) => !acc.includes(key) ? uniqueKey.concat([key]) : uniqueKey
                        , [])
            )
            , []);
    const replacer = (key, value) => value === null ? '' : value
    let dataForFile = [
        listOfKey.map(head => '"' + head.replace(/"/g, "'") + '"').join(','),
        ...data
            .map(
                elementOfData => listOfKey
                    .map(
                        field => JSON
                            .stringify(
                                typeof elementOfData[field] === 'string' ? elementOfData[field]
                                    .replace(/"/g, "'")
                                    :
                                    typeof elementOfData[field] === 'object' ?
                                        elementOfData[field] !== null ?
                                            JSON.stringify(elementOfData[field]).replace(/"/g, "'")
                                            : "null"
                                        :
                                        typeof elementOfData[field] === 'function' ? 'function'
                                            :
                                            elementOfData[field],
                                replacer
                            )
                    ).join(','))
    ].join('\r\n')

    try {
        fs.writeFile(name + '.csv', dataForFile, { flag: 'w+' }, err => {
            if (err) {
                console.error(err);
            } else {
            }
        });
    }
    catch (error) {
        console.log(error.message)
        return 0;
    }
    return 1;
}

let getDataFromELMA;

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
    let next = 'someAddressWillBeReplacedFromSystem'
    let listOfElements = [];
    while (next) {
        let dataContainListOfElements = await makeReq('get' + typeOfData + 'List', token, '?page=' + nextPage++)
        logWriter('getAllElementsFromCasavi ' + typeOfData + ' nextPage - ' + nextPage);
        console.log('getAllElementsFromCasavi ' + typeOfData + ' nextPage - ', nextPage);
        next = dataContainListOfElements._links.next
        listOfElements = listOfElements.concat(dataContainListOfElements.list);
    }
    return listOfElements;
}

async function enrichTheData(listOfContact) {
    async function resolveListOfELMAIds(typeOfElement, nameOfIdElementInELMAFromCasavi, ids) {
        let ELMAElemIdsPromises = ids.map(async elemId => await resolveELMAId(typeOfElement, nameOfIdElementInELMAFromCasavi, elemId))
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
            )
        }
    )
    return await Promise.all(listOfContact);
}

async function generateRequestParam(contact) {
    logWriter('generateRequestParam - contact - ' + JSON.stringify(contact));
    let bodyOfQueryCreateElmaTicket = {
        "context": {},
        "withEventForceCreate": false,
    }
    for (const key of Object.keys(contact)) {
        logWriter('key - ' + key);
        let keyObj = mappingCasaviELMA.find(keyObj => keyObj.keyCasavi === key);
        if (!keyObj) continue
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
                || undefined
            if (kE.split('.').length < 1) return
            if (kE.split('.').length === 1) {
                if (kE.slice(-2) !== '[]') {
                    logWriter('is primitive');
                    copyOfContext[kE] = !func ? contact[key] : await func(contact[key])
                    logWriter('copyOfContext[kE] - ' + JSON.stringify(copyOfContext[kE]));
                } else {
                    let funcResult = await func(contact[key]);
                    logWriter('is array');
                    if (func && (!funcResult || funcResult.map && !funcResult[0])) continue
                    if (!copyOfContext[kE.slice(0, -2)]) copyOfContext[kE.slice(0, -2)] = [];
                    copyOfContext[kE.slice(0, -2)] =
                        copyOfContext[kE.slice(0, -2)]
                            .concat(!func ? JSON.parse(contact[key]) : funcResult)
                    logWriter('copyOfContext[kE.slice(0, -2)] - ' + JSON.stringify(copyOfContext[kE.slice(0, -2)]));
                }
            } else {
                logWriter('is object');
                let valueFromCasavi = !func ? contact[key] : await func(contact[key]);
                if (!valueFromCasavi) continue
                kE.split('.').reduce(
                    (acc, partOfELMAKey) => {
                        if (!acc.lastKey) {
                            acc.lastKey = partOfELMAKey
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
            bodyOfQueryCreateElmaTicket.context = copyOfContext
        }
    }
    let ELMAContactId = undefined;
    if (contact.id) {
        ELMAContactId = await resolveELMAId('ELMAContacts', 'contact_id', contact.id)
    }
    if (!ELMAContactId) {
        logWriter('contact.id not found in ElMA - ' + contact.id);
    }
    logWriter('request body - ' + bodyOfQueryCreateElmaTicket);
    if (ELMAContactId) {
        return ['updateContact', ELMAconf.token, Object.assign({}, bodyOfQueryCreateElmaTicket), 'ELMA', ELMAContactId]
    } else {
        return ['createContact', ELMAconf.token, Object.assign({}, bodyOfQueryCreateElmaTicket), "ELMA"]
    }
}

async function generateAndMakeRequest(contact, latency) {
    let requestParam = await generateRequestParam(contact);
    console.log('requestParam - ', requestParam);
    let reqPromise = new Promise(function (resolve, reject) {
        setTimeout(async () => { resolve(await makeReq(...requestParam)) }, latency)
    })
    let res = await reqPromise;
    if (typeof res !== 'object') {
        res = [res].fill("", 1, 4)
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

async function main() {
    getDataFromELMA = await storageDataFromELMA();
    await getDataFromELMA();
    let listOfContact = await getAllElementsFromCasavi('Contact');
    listOfContact = await enrichTheData(listOfContact);
    [
        ['contacts', listOfContact],
        ['ELMAUnits', (await getDataFromELMA()).ELMAUnits],
        ['ELMAProperty', (await getDataFromELMA()).ELMAProperties],
        ['ELMAContacts', (await getDataFromELMA()).ELMAContacts]
    ].map(
        couple => {
            generateCSV(couple[0], couple[1]) || console.log('file not wrote');
        }
    )

    let resultOfMakingContactInELMA = [];
    while (listOfContact.length) {
        logWriter('start work with  contact row - listOfContact[listOfContact.length - 1] - ' +
            JSON.stringify(listOfContact[listOfContact.length - 1]));
        resultOfMakingContactInELMA.push(
            await generateAndMakeRequest(listOfContact.pop(), 60000 / 80)
        );
        logWriter('moment result - ' + JSON.stringify(resultOfMakingContactInELMA[resultOfMakingContactInELMA.length - 1]))
        console.log('Rest of element - ', listOfContact.length)
        logWriter('Rest of element - ' + listOfContact.length)
    }
    console.log('full result - ', resultOfMakingContactInELMA);
}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var waitForUserInput = function () {
    rl.question("Command: ", function (answer) {
        if (answer == "e") {
            rl.close();
        } else {
            waitForUserInput();
        }
    });
}

// Функция для получения данных "Reasons why NOT responsible" с ELMA
async function getReasonsWhyNotResponsible(sourceUrl, sourceToken) {
    const allData = [];
    let from = 0;
    const size = 1000;

    try {
        // URL для получения списка причин
        const url = `${sourceUrl}/pub/v1/app/customertest/reasons_resposible/list`;

        while (true) {
            // Запрос данных с исходного URL
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sourceToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    size,
                    from
                })
            });

            // Проверка на успешность ответа
            if (!response.ok) {
                throw new Error(`Error fetching data from source: ${response.statusText}`);
            }

            // Проверка, является ли ответ JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const htmlResponse = await response.text();
                console.error('Received HTML error response:', htmlResponse);
                throw new Error('Received HTML error response instead of JSON');
            }

            // Получение данных в формате JSON
            const data = await response.json();

            // Выводим данные в консоль
            console.log('Data received:', data);

            // Если `data.result.result` отсутствует, завершаем цикл
            if (!data.result || !data.result.result) {
                break;
            }

            // Добавление данных в общий массив
            allData.push(...data.result.result);

            // Проверка, есть ли еще данные для получения
            if (data.result.result.length < size) {
                break;
            }

            from += size;
        }

        // Возвращаем все собранные данные и вспомогательную информацию
        return {
            success: true,
            error: "",
            total: allData.length,
            items: allData
        };
    } catch (error) {
        console.error('Error in getReasonsWhyNotResponsible:', error.message);
        throw error;
    }
}

// Функция для создания файла с данными и получения его хеша
function createDataFile(data) {
    const filePath = './reasons_data.json';
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    return { filePath, fileHash: hex };
}

// Функция для загрузки файла на сервер
async function uploadFile(filePath, token) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const response = await fetch('https://your-elma-instance/disk/file/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: form
    });
    
    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.hash;
}

// Функция для импорта данных
async function importData(namespace, code, fileHash, token) {
    const url = `https://your-elma-instance/pub/v1/app/${namespace}/${code}/import`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileHash,
            format: 'json',
            withEventHandlers: false
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to import data: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
}

// Функция для передачи данных
async function transferReasonsWhyNotResponsible(sourceUrl, sourceToken, destinationToken, namespace, code) {
    try {
        let from = 0;
        const size = 1000;

        while (true) {
            // Получаем данные с исходного URL
            const data = await getReasonsWhyNotResponsible(sourceUrl, sourceToken, from, size);

            // Если данные пусты, завершаем цикл
            if (data.items.length === 0) {
                break;
            }

            // Создаем файл с данными и получаем его хеш
            const { filePath, fileHash } = createDataFile(data);

            // Загружаем файл на сервер и получаем хеш файла
            const uploadedFileHash = await uploadFile(filePath, sourceToken);

            // Импортируем данные с использованием хеша файла
            const importResult = await importData(namespace, code, uploadedFileHash, destinationToken);

            console.log('Data imported successfully:', importResult);

            // Увеличиваем from для следующего чанка данных
            from += size;
        }
    } catch (error) {
        console.error('Error transferring data:', error.message);
    }
}

// Экспорт функций
module.exports = {
    makeReq,
    authentication,
    getAllElementsFromCasavi,
    enrichTheData,
    generateCSV,
    generateAndMakeRequest,
    storageDataFromELMA,
    startScript, // Не забудьте экспортировать основную функцию
    getReasonsWhyNotResponsible, // Экспортируем новую функцию
    createDataFile,
    uploadFile,
    importData,
    transferReasonsWhyNotResponsible
};
