import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import Header from './components/Header/Header';
import CasaviToElma from './components/CasaviToElma/CasaviToElma';
import ElmaToElma from './components/ElmaToElma/ElmaToElma';

function App() {
  const [selectedTab, setSelectedTab] = useState('casaviToElma');

  const handleTabClick = (tab) => {
    setSelectedTab(tab);
  };

  return (
    <div className="App">
      <Sidebar handleTabClick={handleTabClick} selectedTab={selectedTab} />
      <div className="main-content">
        <Header />
        {selectedTab === 'casaviToElma' && <CasaviToElma />}
        {selectedTab === 'elmaToElma' && <ElmaToElma />}
      </div>
    </div>
  );
}

export default App;
