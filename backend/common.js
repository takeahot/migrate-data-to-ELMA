// backend/common.js

const fs = require('fs');
const crypto = require('crypto');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path'); // Импорт path для работы с путями

let timeStart = new Date();

function logWriter(text) {
    fs.writeFileSync(timeStart.toString() + '.txt',
        new Date().toString() + text + "\n",
        { flag: 'a' },
        err => {
            if (err) {
                console.error(err);
            }
        });
}

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

function generateCSV(name, data, wrapHeaders = false, excludeHeaders = []) {
    let listOfKey = data.reduce((acc, elementOfData) => acc.concat(
        Object.keys(elementOfData).reduce((uniqueKey, key) => 
            !acc.includes(key) && !excludeHeaders.includes(key) ? uniqueKey.concat([key]) : uniqueKey, []
        )
    ), []);
    
    if (wrapHeaders) {
        listOfKey = listOfKey.map(key => `[${key}]`);
    }

    const replacer = (key, value) => value === null || value === undefined ? '' : value;

    let dataForFile = [
        listOfKey.map(head => '"' + head.replace(/"/g, "'") + '"').join(','),
        ...data.map(elementOfData => listOfKey.map(field => 
            JSON.stringify(
                typeof elementOfData[field.replace(/^\[|\]$/g, '')] === 'string' ? elementOfData[field.replace(/^\[|\]$/g, '')].replace(/"/g, "'")
                : typeof elementOfData[field.replace(/^\[|\]$/g, '')] === 'object' 
                    ? elementOfData[field.replace(/^\[|\]$/g, '')] !== null 
                        ? JSON.stringify(elementOfData[field.replace(/^\[|\]$/g, '')]).replace(/"/g, "'")
                        : ""
                    : typeof elementOfData[field.replace(/^\[|\]$/g, '')] === 'function' 
                        ? 'function'
                        : elementOfData[field.replace(/^\[|\]$/g, '')],
                replacer
            )
        ).join(','))
    ].join('\r\n');

    try {
        fs.writeFileSync(name + '.csv', dataForFile, { flag: 'w+' });
    } catch (error) {
        console.log(error.message);
        return 0;
    }
    return 1;
}

async function createDataFile(data) {
    const fileName = 'reasons_data.csv'; // Название файла
    const filePath = path.join(__dirname, fileName); // Полный путь к файлу

    // Создаем CSV файл с обернутыми в квадратные скобки заголовками и исключаем заголовок "__version"
    generateCSV(fileName, data, true, ['__version','__subscribers']);

    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    return { filePath, fileHash: hex };
}

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
            format: 'csv',
            withEventHandlers: false
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to import data: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
}

// Экспорт функций
module.exports = {
    logWriter,
    makeReq,
    authentication,
    generateCSV,
    createDataFile,
    uploadFile,
    importData,
};
