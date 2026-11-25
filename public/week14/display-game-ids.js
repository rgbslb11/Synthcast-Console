'use strict';
(() => {
  // Chairman-approved display IDs for games beginning November 26, 2026.
  // GameCast controls and persisted events still address the live game ID.
  const displayIds = Object.freeze({
    G1403: 'G0721', // TCU at Texas Tech
    G1404: 'G0679', // LSU at Arkansas
    G1405: 'G0723', // Georgia Tech at Georgia
    G1406: 'G0724', // Louisville at Kentucky
    G1407: 'G0718', // North Dakota State at Tulane
    G1408: 'G0695', // Nebraska at Iowa
    G1409: 'G0731', // Virginia at Virginia Tech
    G1410: 'G0688', // Florida State at Florida
    G1411: 'G0698', // Holy Cross at Lehigh
    G1412: 'G0732', // Duke at Wake Forest
    G1413: 'G0681', // Pittsburgh at California
    G1414: 'G0733', // Minnesota at Wisconsin
    G1415: 'G0728', // West Virginia at Utah
    G1416: 'G0680', // Cincinnati at BYU
    G1417: 'G0714', // SMU at Stanford
    G1418: 'G0687', // East Carolina at Florida Atlantic
    G1419: 'G0692', // Yale at Harvard
    G1420: 'G0712', // Penn at Princeton
    G1421: 'G0683', // South Carolina at Clemson
    G1422: 'G0700', // Boston College at Miami
    G1423: 'G0704', // UTEP at Northern Illinois
    G1424: 'G0717', // Southern Miss at Temple
    G1425: 'G0703', // Middle Tennessee at Marshall
    G1426: 'G0711', // Michigan at Ohio State
    G1427: 'G0715', // Notre Dame at Syracuse
    G1428: 'G0725', // NC State at North Carolina
    G1429: 'G0682', // Buffalo at Coastal Carolina
    G1430: 'G0702', // Oklahoma at Missouri
    G1431: 'G0696', // Kansas State at Iowa State
    G1432: 'G0713', // Michigan State at Rutgers
    G1433: 'G0707', // Illinois at Northwestern
    G1434: 'G0705', // Air Force at New Mexico
    G1435: 'G0677', // Auburn at Alabama
    G1436: 'G0691', // UAB at Georgia State
    G1437: 'G0684', // UCF at Colorado
    G1438: 'G0719', // Army at Tulsa
    G1439: 'G0708', // North Texas at Old Dominion
    G1440: 'G0699', // Penn State at Maryland
    G1441: 'G0709', // Kansas at Oklahoma State
    G1442: 'G0690', // Delaware at Georgia Southern
    G1443: 'G0720', // Florida International at Troy
    G1444: 'G0730', // Tennessee at Vanderbilt
    G1445: 'G0686', // Boise State at Colorado State
    G1446: 'G0729', // South Florida at UTSA
    G1447: 'G0734', // San Diego State at Washington State
    G1448: 'G0697', // Purdue at Indiana
    G1449: 'G0701', // Mississippi State at Ole Miss
    G1450: 'G0710', // Washington at Oregon
    G1451: 'G0726', // Nevada at UNLV
    G1452: 'G0722', // USC at UCLA
    G1453: 'G0716', // Texas at Texas A&M
    G1454: 'G0694', // Baylor at Houston
    G1455: 'G0727', // Texas State at Utah State
    G1456: 'G0689', // Oregon State at Fresno State
    G1457: 'G0678', // Arizona State at Arizona
    G1458: 'G0706', // Rice at New Mexico State
    G1459: 'G0693', // Navy at Hawaii
  });

  globalThis.week14DisplayGameId = id => Object.hasOwn(displayIds, id) ? displayIds[id] : id;
})();
