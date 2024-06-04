const { makeReq, logWriter, createDataFile, uploadFile, importData } = require('./common');

// Универсальная функция для получения данных из ELMA
async function getDataFromELMA(sourceUrl, sourceToken, namespace, code, steps) {
    const allData = [];
    let from = 0;
    const size = 1000;

    // Проверка на наличие двойного слэша
    sourceUrl = sourceUrl.replace(/([^:]\/)\/+/g, "$1");

    try {
        // URL для получения данных
        const url = `${sourceUrl}/pub/v1/app/${namespace}/${code}/list`;
        steps.push(`Requesting data from ${url} at ${new Date().toISOString()}`);

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
                    from,
                }),
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
            error: '',
            total: allData.length,
            items: allData,
        };
    } catch (error) {
        console.error('Error in getDataFromELMA:', error.message);
        throw error;
    }
}

// Универсальная функция для фильтрации данных
function filterData(data) {
    return data.map(item => {
        const filteredItem = {};
        for (const key in item) {
            if (Array.isArray(item[key]) || ['__version', '__subscribers'].includes(key)) {
                continue;
            }
            filteredItem[key] = item[key];
        }
        return filteredItem;
    });
}

async function transferDataFromELMA(sourceUrl, sourceToken, destinationToken, namespace, code, steps) {
    try {
        // Получаем данные с исходного URL
        const { items } = await getDataFromELMA(sourceUrl, sourceToken, namespace, code, steps);
        const filteredItems = filterData(items);

        // Создаем CSV файл с данными и исключаем технические данные
        const { filePath, fileHash } = await createDataFile(filteredItems);

        // Загружаем CSV файл на сервер и получаем хеш файла
        const uploadedFileHash = await uploadFile(filePath, destinationToken);

        // Импортируем данные с использованием хеша файла
        const importResult = await importData(namespace, code, uploadedFileHash, destinationToken);
        steps.push(`Data imported successfully at ${new Date().toISOString()}: ${JSON.stringify(importResult)}`);

        // Дополнительное обновление элементов
        await updateElements(items, destinationToken, namespace, code, steps);

        console.log('Data imported successfully:', importResult);
    } catch (error) {
        console.error('Error transferring data:', error.message);
        steps.push(`Error at ${new Date().toISOString()}: ${error.message}`);
        throw error;
    }
}

// Функция для дополнительного обновления элементов
async function updateElements(items, destinationToken, namespace, code, steps) {
    for (const item of items) {
        const context = {
            context: item,
            withEventForceCreate: false,
        };

        let attempt = 0;
        let success = false;
        while (!success && attempt < 3) {
            try {
                const response = await makeRequestWithDelay(`${destinationUrl}/pub/v1/app/${namespace}/${code}/update`, context, destinationToken, 1000);
                steps.push(`Data updated successfully at ${response.responseTime}: ${JSON.stringify(response)}`);
                success = true;
            } catch (error) {
                steps.push(`Attempt ${attempt + 1} failed at ${new Date().toISOString()}: ${error.message}`);
                attempt++;
            }
        }
        if (!success) {
            throw new Error('Failed to update data after 3 attempts');
        }
    }
}

// Функция для задержки
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для отправки запроса с задержкой
async function makeRequestWithDelay(url, body, token, delayMs) {
    await delay(delayMs);

    const requestStartTime = new Date().toISOString();
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const responseTime = new Date().toISOString();
    
    if (!response.ok) {
        throw new Error(`Failed to send data: ${response.statusText} at ${responseTime}`);
    }

    const responseData = await response.json();
    responseData.requestStartTime = requestStartTime;
    responseData.responseTime = responseTime;
    
    return responseData;
}

// Экспорт функций
module.exports = {
    getDataFromELMA,
    transferDataFromELMA,
    filterData,
};
