import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import './ElmaToElma.css';

function ElmaToElma() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([]);
  const [selectedOption, setSelectedOption] = useState('contacts');
  const [sourceUrl, setSourceUrl] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [sourceToken, setSourceToken] = useState('');
  const [destinationToken, setDestinationToken] = useState('');
  const [namespace, setNamespace] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    const savedSourceUrl = Cookies.get('sourceUrl') || '';
    const savedDestinationUrl = Cookies.get('destinationUrl') || '';
    const savedSourceToken = Cookies.get('sourceToken') || '';
    const savedDestinationToken = Cookies.get('destinationToken') || '';
    const savedNamespace = Cookies.get('namespace') || '';
    const savedCode = Cookies.get('code') || '';

    setSourceUrl(savedSourceUrl);
    setDestinationUrl(savedDestinationUrl);
    setSourceToken(savedSourceToken);
    setDestinationToken(savedDestinationToken);
    setNamespace(savedNamespace);
    setCode(savedCode);
  }, []);

  const handleSourceUrlChange = (e) => {
    const url = e.target.value;
    extractNamespaceAndCode(url, setNamespace, setCode, setSourceUrl);
  };

  const handleDestinationUrlChange = (e) => {
    const url = e.target.value;
    extractNamespaceAndCode(url, setNamespace, setCode, setDestinationUrl);
  };

  const handleSourceTokenChange = (e) => {
    const token = e.target.value;
    setSourceToken(token);
    Cookies.set('sourceToken', token);
  };

  const handleDestinationTokenChange = (e) => {
    const token = e.target.value;
    setDestinationToken(token);
    Cookies.set('destinationToken', token);
  };

  const handleNamespaceChange = (e) => {
    const namespace = e.target.value;
    setNamespace(namespace);
    Cookies.set('namespace', namespace);
  };

  const handleCodeChange = (e) => {
    const code = e.target.value;
    setCode(code);
    Cookies.set('code', code);
  };

  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value);
  };

  const handleTransferData = async () => {
    setLoading(true);
    setError(null);
    setSteps([]);
    try {
      const response = await axios.post('/api/transfer-data', {
        sourceUrl,
        destinationUrl,
        sourceToken,
        destinationToken,
        namespace,
        code,
      });
      setData(response.data);
      setSteps(response.data.steps);
    } catch (err) {
      setError(err.message);
      if (err.response && err.response.data) {
        setSteps(err.response.data.steps || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const extractNamespaceAndCode = (url, setNamespace, setCode, setUrl) => {
    const urlParts = url.split('/');
    if (urlParts.length > 3) {
      const domain = `${urlParts[0]}//${urlParts[2]}`;
      const namespace = urlParts[3] || '';
      const code = urlParts[4] || '';
      setNamespace(namespace);
      setCode(code);
      setUrl(domain);
      Cookies.set('namespace', namespace);
      Cookies.set('code', code);
    } else {
      setUrl(url);
    }
    Cookies.set(urlParts[2].includes('source') ? 'sourceUrl' : 'destinationUrl', url);
  };

  const renderData = (data) => {
    if (typeof data === 'object') {
      return <pre className="json-data">{JSON.stringify(data, null, 2)}</pre>;
    }
    return data;
  };

  return (
    <div className="elma-to-elma">
      <h2>Transfer Data from ELMA to ELMA</h2>
      <div className="form-container">
        <div className="block">
          <h3>Source</h3>
          <div className="input-group">
            <label>Source URL:</label>
            <input type="text" value={sourceUrl} onChange={handleSourceUrlChange} />
          </div>
          <div className="input-group">
            <label>Source Token:</label>
            <input type="text" value={sourceToken} onChange={handleSourceTokenChange} />
          </div>
        </div>
        <div className="block">
          <h3>Destination</h3>
          <div className="input-group">
            <label>Destination URL:</label>
            <input type="text" value={destinationUrl} onChange={handleDestinationUrlChange} />
          </div>
          <div className="input-group">
            <label>Destination Token:</label>
            <input type="text" value={destinationToken} onChange={handleDestinationTokenChange} />
          </div>
        </div>
        <div className="block">
          <h3>Details</h3>
          <div className="input-group">
            <label>Namespace:</label>
            <input type="text" value={namespace} onChange={handleNamespaceChange} />
          </div>
          <div className="input-group">
            <label>Code:</label>
            <input type="text" value={code} onChange={handleCodeChange} />
          </div>
        </div>
      </div>
      <button onClick={handleTransferData} disabled={loading}>
        {loading ? 'Transferring...' : 'Transfer Data'}
      </button>
      {error && <p className="error">Error: {error}</p>}
      <ul>
        {steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
      {data && <div>{renderData(data)}</div>}
    </div>
  );
}

export default ElmaToElma;
