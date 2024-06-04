const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDataFromELMA, transferDataFromELMA } = require('./elmaToElma');

const app = express();
const port = 5001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.get('/api/data', async (req, res) => {
    try {
        const getDataFromELMA = await storageDataFromELMA();
        await getDataFromELMA();
        let listOfContact = await getAllElementsFromCasavi('Contact');
        listOfContact = await enrichTheData(listOfContact);

        const result = await generateAndMakeRequest(listOfContact.pop(), 60000 / 80);

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contacts', async (req, res) => {
    const { sourceUrl, destinationUrl, sourceToken, destinationToken } = req.body;
    const missingParams = [];

    if (!sourceUrl) missingParams.push('sourceUrl');
    if (!destinationUrl) missingParams.push('destinationUrl');
    if (!sourceToken) missingParams.push('sourceToken');
    if (!destinationToken) missingParams.push('destinationToken');

    if (missingParams.length > 0) {
        return res.status(400).json({ error: 'Missing parameters', missingParams });
    }

    res.status(200).json({ message: 'я работаю' });
});

app.post('/api/transfer-data', async (req, res) => {
    const { sourceUrl, destinationUrl, sourceToken, destinationToken, namespace, code } = req.body;
    const missingParams = [];

    if (!sourceUrl) missingParams.push('sourceUrl');
    if (!destinationUrl) missingParams.push('destinationUrl');
    if (!sourceToken) missingParams.push('sourceToken');
    if (!destinationToken) missingParams.push('destinationToken');
    if (!namespace) missingParams.push('namespace');
    if (!code) missingParams.push('code');

    if (missingParams.length > 0) {
        console.error('Missing parameters:', missingParams);
        return res.status(400).json({ error: 'Missing parameters', missingParams });
    }

    const steps = [];

    try {
        steps.push(`Starting the process of transferring data at ${new Date().toISOString()}.`);
        console.log('Starting transfer data process...');

        const data = await getDataFromELMA(sourceUrl, sourceToken, namespace, code, steps);
        steps.push(`Data retrieved at ${new Date().toISOString()}: ${JSON.stringify(data, null, 2)}`); // форматированный JSON
        console.log('Data retrieved:', data);

        await transferDataFromELMA(data.items, sourceToken, destinationUrl, destinationToken, namespace, code, steps);

        res.status(200).json({ message: 'Data transferred successfully', steps: formatSteps(steps) });
    } catch (error) {
        steps.push(`Error at ${new Date().toISOString()}: ${error.message}`);
        console.error('Error during data transfer:', error);
        res.status(500).json({ error: error.message, steps: formatSteps(steps) });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

function formatSteps(steps) {
    return steps.map(step => {
        if (typeof step === 'string' && step.startsWith('{') && step.endsWith('}')) {
            try {
                const json = JSON.parse(step);
                return JSON.stringify(json, null, 2);
            } catch (e) {
                return step;
            }
        }
        return step;
    });
}
