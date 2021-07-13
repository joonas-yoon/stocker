function loadJSON(path, success, error) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", path, true);
  xhr.responseType = 'json';
  xhr.onload = function(e) {
    if (success) success(this.response);
  };
  xhr.onerror = error;
  xhr.send();
}

function markdownLinkToTag(text) {
  return text.replace(/(.+)?\[(.+)\]\((.+)\)(.+)?/, '$1<a href="$3">$2</a>$4');
}

function isPositive(tp) {
  return tp.indexOf("-") === -1;
}

function appendClass(node, cls) {
  if (cls) node.setAttribute('class', node.getAttribute('class') + ' ' + cls);
}

function createTableRow(name, data) {
  var form = document.getElementById("template-table-row").cloneNode(true).content;
  var row = form.querySelector("tr");
  var color = '';
  var p1 = isPositive(data["target_1"]), p2 = isPositive(data["target_2"]);
  if (p1 && p2) color = 'text-white bg-success';
  else if (!p1 && !p2) color = 'text-white bg-danger';
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
  var p1 = isPositive(data["target_1"]), p2 = isPositive(data["target_2"]);
  appendClass(li[0], 'text-white ' + (p1 ? 'bg-success' : 'bg-danger'));
  appendClass(li[1], 'text-white ' + (p2 ? 'bg-success' : 'bg-danger'));
  return form;
}

function onSuccess(json) {
  var table = document.getElementById("table");
  var tbody = table.getElementsByTagName("tbody")[0];
  var cards = document.getElementById("cards");
  var table = json["table"];
  Object.keys(table).forEach(function(name, i){
    tbody.appendChild(createTableRow(name, table[name]));
    cards.appendChild(createCard(name, table[name]));
  });
  var last_updated = json["last_updated"];
  document.getElementById("last_updated").innerText = last_updated || 'unknown';
}

function onError(error) {
  console.error(error);
}

function showOnlyPattern(el, patterns, propDislay, propHide) {
  var code = el.getAttribute('data-code');
  var matched = patterns.length === 0 || patterns.some(function(p){
    return p.length && code.indexOf(p) !== -1;
  });
  el.style.display = matched ? propDislay : propHide;
}

function filter(text) {
  text = text.replaceAll(' ', '').toUpperCase() || '';
  var patterns = text.split(',').filter(function(s){ return s.replaceAll(' ', '').length; })
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

window.onload = function() {
  loadJSON('data.json', onSuccess, onError);
  addSearchEventListener();
};
