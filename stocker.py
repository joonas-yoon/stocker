import os
import json
import requests
from bs4 import BeautifulSoup as bs
from datetime import datetime
from time import mktime, sleep
from random import randint

def get_or_blank(d, key, blank):
  return d[key] if key in d else blank


OUTPUT_FILE = 'README.md'
OUTPUT_JSON_FILE = 'data.json'
OUTPUT_CHART_JSON = 'chart.json'
OUTPUT_CHART_MIN_JSON = 'chart.min.json'

icons = [9196, 128317, 9208, 128316, 9195]

ms_list = {
  'AAPL': '-4849',
  'AMD': '-19475876',
  'AMZN': '-12864605',
  'DIS': '-4842',
  'FB': '-10547141',
  'FDX': '-12585',
  'GOOGL': '-24203373',
  'INTC': '-4829',
  'MSFT': '-4835',
  'RBLX': '-117793644',
  'TPVG': '-15933327',
  'TSLA': '-6344549',
  'U': '-112492634',
}

table = {}
raw_numbers = {}

# consensus_1, target_1 for A
for code, link in ms_list.items():
  if len(link) < 1: continue
  href = 'https://m.marketscreener.com/quote/stock/' + link + '/'
  try:
    res = requests.get(href)
    html = bs(res.text, 'html.parser')
    rows = html.select('table.Bord')[-1].find_all('tr')[1:]
    cols = [r.find_all('td')[1].text.strip() for r in rows]
    consensus, analysts, last_close, target_price, target_p = cols
    last_close, target_price, target_p = map(lambda s: s.replace('\u00a0', '').replace(' ', '').replace(',', '.'), [last_close, target_price, target_p])
    if target_p[0] != '-': target_p = '+' + target_p
    clevel = "SUHOB".index(consensus[0].upper())

    table[code] = {}
    table[code]['last_close'] = f'${last_close[:-1]}'
    table[code]['consensus_1'] = '[{} {}]({})'.format(chr(icons[clevel]), consensus.title(), href)
    table[code]['target_1'] = f'${target_price[:-1]} ({target_p})'

    raw_numbers[code] = {}
    raw_numbers[code]['consensus_1'] = clevel
    raw_numbers[code]['target_1'] = float(target_price[:-1].replace('$', ''))
  except:
    pass

# consensus_2, target_2 for B
for code, link in ms_list.items():
  href = 'https://www.tipranks.com/stocks/{}/forecast'.format(code.lower())
  try:
    res = requests.get(href)
    html = bs(res.text, 'html.parser')
    consensus = html.select_one('div[data-sc=consensus]').select_one('span').text
    target_price = html.select_one('div[data-sc=priceTarget]').select_one('div[title]').text

    i = target_price.index('(')-1
    j = target_price.index('%')+1
    target_price, target_p = target_price[:i], target_price[i:j]
    target_price = target_price.replace(',', '') # 1,234 to 1234
    target_p = target_p.replace('???(', '+').replace('???(', '')
    clevel = ["Strong Sell", "Moderate Sell", "Hold", "Moderate Buy", "Strong Buy"].index(consensus)

    table[code]['consensus_2'] = f'[{chr(icons[clevel])} {consensus}]({href})'
    table[code]['target_2'] = f'{target_price} ({target_p})'

    raw_numbers[code]['consensus_2'] = clevel
    raw_numbers[code]['target_2'] = float(target_price.replace('$', ''))
  except:
    print(html)
  sleep((randint(0, 2000) + 10000) / 1000)

# Quotes
quotes_href = 'https://market.tipranks.com/api/details/GetRealTimeQuotes?tickers={}'.format('%2C'.join(ms_list.keys()))
quotes = requests.get(quotes_href).json()
for q in quotes:
  code = q['ticker']
  raw_numbers[code]['low'] = q['low']
  raw_numbers[code]['high'] = q['high']
  raw_numbers[code]['openPrice'] = q['openPrice']
  raw_numbers[code]['closePrice'] = q['price']

# finish
updated_time = datetime.now()

# chart: create file if it doesn't exist
if not os.path.exists(OUTPUT_CHART_JSON):
  with open(OUTPUT_CHART_JSON, 'w+') as f:
    json.dump({}, f)

# chart: read and update
with open(OUTPUT_CHART_JSON, 'r', encoding='utf-8') as f:
  # read as json
  try:
    chart_json = json.load(f)
  except:
    chart_json = {}

  # init
  if not 'history' in chart_json:
    chart_json['history'] = []

  today_str = updated_time.strftime('%Y-%m-%d')
  has_new = True

  if 'date' in chart_json['history'][-1]:
    date = chart_json['history'][-1]['date']
    if date == today_str:
      has_new = False

  # update
  # if has_new:
  today = {
    'list': raw_numbers,
    'date': today_str,
    'timestamp': int(mktime(updated_time.timetuple()))
  }
  chart_json['history'].append(today)

# chart: write
with open(OUTPUT_CHART_JSON, 'w', encoding='utf-8') as f:
  print(chart_json)
  json.dump(chart_json, f, indent=2)

with open(OUTPUT_CHART_MIN_JSON, 'w', encoding='utf-8') as f:
  json.dump(chart_json, f)

# table: read as json
with open(OUTPUT_JSON_FILE, 'w', encoding='utf-8') as f:
  outdata = {
    'table': table,
    'last_updated': updated_time.strftime('%Y-%m-%d %H:%M:%S')
  }
  json.dump(outdata, f, indent=4)

# table: write
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
  f.write('# Stocks\n')
  f.write('Last Updated: ' + updated_time.strftime('%Y-%m-%d %H:%M:%S') + '\n\n')

  f.write('|Code|Last close|Mean Consensus A|Target price(+) A|Mean Consensus B|Target price(+) B|\n')
  f.write('|:--:|-|-|-|-|-|\n')
  for code in sorted(ms_list):
    t = table[code]
    x = chr(10060)
    c1, t1 = get_or_blank(t, 'consensus_1', x), get_or_blank(t, 'target_1', x)
    c2, t2 = get_or_blank(t, 'consensus_2', x), get_or_blank(t, 'target_2', x)
    s = [code, t["last_close"], c1, t1, c2, t2]
    f.write('|{}|\n'.format('|'.join(map(str, s))))

  f.write('\n\n*A from [MarketScreener](https://www.marketscreener.com), *B from [TipRanks](https://www.tipranks.com)\n')
