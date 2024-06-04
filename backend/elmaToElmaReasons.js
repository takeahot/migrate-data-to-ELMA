const { makeReq, logWriter } = require('./common');

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
        console.error('Error in getReasonsWhyNotResponsible:', error.message);
        throw error;
    }
}

async function transferReasonsWhyNotResponsible(data, sourceToken, destinationToken, namespace, code, steps) {
    try {
        for (const item of data) {
            const context = {
                context: item,
                withEventForceCreate: false,
            };

            let attempt = 0;
            let success = false;
            while (!success && attempt < 3) {
                try {
                    const response = await makeRequestWithDelay(`${destinationUrl}/pub/v1/app/${namespace}/${code}/create`, context, destinationToken, 1000);
                    steps.push(`Data sent successfully at ${response.responseTime}: ${JSON.stringify(response)}`);
                    success = true;
                } catch (error) {
                    steps.push(`Attempt ${attempt + 1} failed at ${new Date().toISOString()}: ${error.message}`);
                    attempt++;
                }
            }
            if (!success) {
                throw new Error('Failed to send data after 3 attempts');
            }
        }
    } catch (error) {
        console.error('Error transferring data:', error.message);
        steps.push(`Error at ${new Date().toISOString()}: ${error.message}`);
        throw error;
    }
}

// Экспорт функций
module.exports = {
    getReasonsWhyNotResponsible,
    transferReasonsWhyNotResponsible,
};

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
