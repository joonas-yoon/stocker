let chartData;

function loadJSON(path, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", path, true);
  xhr.responseType = 'json';
  xhr.onload = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        if (success) success(this.response);
      } else {
        if (error) error(this.response);
      }
    }
  };
  xhr.onerror = error;
  xhr.send();
}

function markdownLinkToTag(text) {
  text = text || '';
  return text.replace(/(.+)?\[(.+)\]\((.+)\)(.+)?/, '$1<a href="$3">$2</a>$4');
}

function consensusLevel(cons) {
  cons = cons || [];
  if (cons.indexOf("Outperform") !== -1 || cons.indexOf("Moderate Buy") !== -1) return 1;
  if (cons.indexOf("Underperform") !== -1 || cons.indexOf("Moderate Sell") !== -1) return -1;
  if (cons.indexOf("Buy") !== -1 || cons.indexOf("Strong Buy") !== -1) return 2;
  if (cons.indexOf("Sell") !== -1 || cons.indexOf("Strong Sell") !== -1) return -2;
  return 0;
}

function appendClass(node, cls) {
  if (cls) node.setAttribute('class', node.getAttribute('class') + ' ' + cls);
}

function createTableRow(name, data) {
  var form = document.getElementById("template-table-row").cloneNode(true).content;
  var row = form.querySelector("tr");
  var color = '';
  var c1 = consensusLevel(data["consensus_1"]), c2 = consensusLevel(data["consensus_2"]);
  if (c1 > 0 && c2 > 0) color = 'text-white bg-success';
  else if (c1 < 0 && c2 < 0) color = 'text-white bg-danger';
  else color = 'text-white bg-dark';
  row.setAttribute('data-code', name);
  row.setAttribute('class', color);
  var cols = form.querySelectorAll("td");
  cols[0].innerText = name;
  cols[1].innerText = data["last_close"];
  cols[2].innerHTML = markdownLinkToTag(data["consensus_1"]);
  cols[3].innerText = data["target_1"];
  cols[4].innerHTML = markdownLinkToTag(data["consensus_2"]);
  cols[5].innerText = data["target_2"];
  return form;
}

function createCard(name, data) {
  var form = document.getElementById("template-card").cloneNode(true).content;
  form.querySelector(".card").setAttribute('data-code', name);
  form.querySelector(".card-title").innerText = name;
  form.querySelector(".card-subtitle").innerText = data["last_close"];
  form.querySelector(".consensus_1").innerHTML = markdownLinkToTag(data["consensus_1"]);
  form.querySelector(".target_1").innerText = data["target_1"];
  form.querySelector(".consensus_2").innerHTML = markdownLinkToTag(data["consensus_2"]);
  form.querySelector(".target_2").innerText = data["target_2"];
  var li = form.querySelectorAll("li");
  var c1 = consensusLevel(data["consensus_1"]), c2 = consensusLevel(data["consensus_2"]);
  appendClass(li[0], 'text-white ' + (c1 > 0 ? 'bg-success' : (c1 < 0 ? 'bg-danger' : 'bg-dark')));
  appendClass(li[1], 'text-white ' + (c2 > 0 ? 'bg-success' : (c2 < 0 ? 'bg-danger' : 'bg-dark')));
  return form;
}

function onSuccess(json) {
  var table = document.getElementById("table");
  var tbody = table.getElementsByTagName("tbody")[0];
  var cards = document.getElementById("cards");
  var table = json["table"];
  Object.keys(table).forEach(function(name, i){
    const trow = createTableRow(name, table[name]);
    const card = createCard(name, table[name]);
    tbody.appendChild(trow);
    cards.appendChild(card);
  });
  var last_updated = json["last_updated"];
  document.getElementById("last_updated").innerText = last_updated || 'unknown';
  // events
  (new Array().concat(
    ...document.querySelectorAll('div[data-code]'),
    ...document.querySelectorAll('tr[data-code]')
  )).forEach(node => {
    const code = node.getAttribute('data-code');
    node.addEventListener('mouseover', () => showChart(code));
  });
}

function onError(error) {
  console.error(error);
  // try again with local file
  loadJSON('data.json', onSuccess, function(e){
    window.alert('Failed to load');
  });
}

function showOnlyPattern(el, patterns, propDislay, propHide) {
  var code = el.getAttribute('data-code');
  var matched = patterns.length === 0 || patterns.some(function(p){
    return p.length && code.indexOf(p) !== -1;
  });
  el.style.display = matched ? propDislay : propHide;
}

function filter(text) {
  text = text.replace(/' '/gi, '').toUpperCase() || '';
  var patterns = text.split(',').filter(function(s){ return s.length; })
  var table = document.getElementById("table");
  table.querySelectorAll("tr[data-code]").forEach(function(el){
    showOnlyPattern(el, patterns, 'table-row', 'none');
  });
  var cards = document.getElementById("cards");
  cards.querySelectorAll(".card[data-code]").forEach(function(el){
    showOnlyPattern(el, patterns, 'block', 'none');
  });
}

function addSearchEventListener() {
  var form = document.getElementById("search-input");
  form.addEventListener("input", function(e) {
    filter(e.target.value);
  });
}

function showChart(code) {
  google.charts.load('current', {
    callback: drawChart,
    packages: ['corechart']
  });
  function drawChart() {
    const rows = [
      ['Date', '', 'Open', 'High', 'Close', 'Target 1', 'Target 2'],
    ];
    for (const row of chartData.history) {
      const info = row.list[code];
      if (!info) continue;
      rows.push([
        new Date(row['date']).toISOString().split('T')[0],
        info.low || 0,
        info.openPrice || 0,
        info.high || 0,
        info.closePrice || 0,
        info.target_1,
        info.target_2,
      ]);
    }
    const data = google.visualization.arrayToDataTable(rows);
    const options = {
      title: code,
      seriesType: "candlesticks",
      series: {
        1: {
          type: 'line'
        },
        2: {
          type: 'line'
        }
      },
      vAxes: [
        {
          title: 'Quotes',
        }
      ],
      curveType: 'function',
      legend: {
        position: 'bottom'
      },
    };
    const chart = new google.visualization.ComboChart(document.getElementById('chart'));
    chart.draw(data, options);
  }
}

window.onload = function() {
  // fetch chart data
  loadJSON(
    './chart.min.json',
    result => { chartData = result; },
    result => { chartData = result; },
    // function (error) {
    //   console.error(error);
    //   window.alert('Failed to load chart');
    // }
  );
  // ui
  loadJSON('https://raw.githubusercontent.com/joonas-yoon/stocker/main/data.json', onSuccess, onError);
  addSearchEventListener();
};
