import React, { useState } from 'react';
import axios from 'axios';
import './CasaviToElma.css';

function CasaviToElma() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (url) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(url);
      setData(response.data);
    } catch (err) {
      setError('An error occurred while fetching data');
    }
    setLoading(false);
  };

  return (
    <div className="casaviToElma">
      <h2>CASAVI to ELMA</h2>
      <button onClick={() => fetchData('http://localhost:5001/api/data')} disabled={loading}>
        {loading ? 'Loading...' : 'Transfer data'}
      </button>
      {data && (
        <div>
          <h2>Result:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default CasaviToElma;
