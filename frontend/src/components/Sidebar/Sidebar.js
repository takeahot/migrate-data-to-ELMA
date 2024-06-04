import React from 'react';
import './Sidebar.css';

function Sidebar({ handleTabClick, selectedTab }) {
  return (
    <div className="sidebar">
      <ul className="MuiList-root MuiList-padding css-b42ugf">
        <li
          className={`MuiListItem-root MuiListItem-padding css-1cwehnr ${selectedTab === 'casaviToElma' ? 'active' : ''}`}
          onClick={() => handleTabClick('casaviToElma')}
        >
          <div className="MuiBox-root css-19dngxh">
            <div className="MuiListItemIcon-root css-1tyhgf4">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" color="inherit" height="15px" width="15px" xmlns="http://www.w3.org/2000/svg" style={{ color: 'inherit' }}>
                <path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z"></path>
                <path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0043 267.56L250.5 69.28a8 8 0 0111.06 0l207.52 198.28a16 16 0 0022.59-.44c6.14-6.36 5.63-16.86-.76-22.97z"></path>
              </svg>
            </div>
            <div className="MuiListItemText-root css-11mrcoa">
              <span className="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-va0z32">CASAVI to ELMA</span>
            </div>
            <span className="material-icons-round notranslate MuiIcon-root MuiIcon-fontSizeInherit css-u6kooy" aria-hidden="true">expand_less</span>
          </div>
        </li>
        <li
          className={`MuiListItem-root MuiListItem-padding css-1cwehnr ${selectedTab === 'elmaToElma' ? 'active' : ''}`}
          onClick={() => handleTabClick('elmaToElma')}
        >
          <div className="MuiBox-root css-19dngxh">
            <div className="MuiListItemIcon-root css-1tyhgf4">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" color="inherit" height="15px" width="15px" xmlns="http://www.w3.org/2000/svg" style={{ color: 'inherit' }}>
                <path d="M261.56 101.28a8 8 0 00-11.06 0L66.4 277.15a8 8 0 00-2.47 5.79L63.9 448a32 32 0 0032 32H192a16 16 0 0016-16V328a8 8 0 018-8h80a8 8 0 018 8v136a16 16 0 0016 16h96.06a32 32 0 0032-32V282.94a8 8 0 00-2.47-5.79z"></path>
                <path d="M490.91 244.15l-74.8-71.56V64a16 16 0 00-16-16h-48a16 16 0 00-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0043 267.56L250.5 69.28a8 8 0 0111.06 0l207.52 198.28a16 16 0 0022.59-.44c6.14-6.36 5.63-16.86-.76-22.97z"></path>
              </svg>
            </div>
            <div className="MuiListItemText-root css-11mrcoa">
              <span className="MuiTypography-root MuiTypography-body1 MuiListItemText-primary css-va0z32">ELMA to ELMA</span>
            </div>
            <span className="material-icons-round notranslate MuiIcon-root MuiIcon-fontSizeInherit css-u6kooy" aria-hidden="true">expand_less</span>
          </div>
        </li>
      </ul>
    </div>
  );
}

export default Sidebar;
