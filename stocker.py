import requests
from bs4 import BeautifulSoup as bs
from time import sleep
from datetime import datetime

icons = [9196, 128317, 9208, 128316, 9195]

ms_list = {
    'AAPL': 'APPLE-INC-4849',
    'AMZN': 'AMAZON-COM-INC-12864605',
    'DIS': 'WALT-DISNEY-COMPANY-THE-4842',
    'FB': 'FACEBOOK-INC-10547141',
    'FDX': 'FEDEX-CORPORATION-12585',
    'GOOGL': 'ALPHABET-INC-24203373',
    'MSFT': 'MICROSOFT-CORPORATION-4835',
    'RBLX': 'ROBLOX-CORPORATION-117793644',
    'TPVG': 'TRIPLEPOINT-VENTURE-GROWT-15933327',
    'TSLA': 'TESLA-INC-6344549',
    'U': 'UNITY-SOFTWARE-INC-112492634'
}

table = {}

for code, link in ms_list.items():
    href = 'https://m.marketscreener.com/quote/stock/' + link + '/'
    res = requests.get(href)
    html = bs(res.text, 'html.parser')
    rows = html.select('table.Bord')[-1].find_all('tr')
    cols = [r.find_all('td')[1].text.strip() for r in rows]
    consensus, analysts, last_close, target_price, target_p = cols
    last_close, target_price, target_p = map(lambda s: s.replace(' ', '').replace(',', '.'), [last_close, target_price, target_p])
    if target_p[0] != '-': target_p = '+' + target_p
    clevel = "SUHOB".index(consensus[0].upper())
    
    table[code] = {}
    table[code]['last_close'] = f'${last_close[:-1]}'
    table[code]['consensus_1'] = '[{} {}]({})'.format(chr(icons[clevel]), consensus.title(), href)
    table[code]['target_1'] = f'${target_price[:-2]} ({target_p})'

for code, link in ms_list.items():
    href = 'https://www.tipranks.com/stocks/{}/forecast'.format(code.lower())
    res = requests.get(href)
    html = bs(res.text, 'html.parser')
    #sleep(1)
    consensus = html.select_one('div[data-sc=consensus]').select_one('span').text
    target_price = html.select_one('div[data-sc=priceTarget]').select_one('div[title]').text

    i = target_price.index('(')-1
    j = target_price.index('%')+1
    target_price, target_p = target_price[:i], target_price[i:j]
    target_p = target_p.replace('▲(', '+').replace('▼(', '')
    clevel = ["Strong Sell", "Moderate Sell", "Hold", "Moderate Buy", "Strong Buy"].index(consensus)
    
    table[code]['consensus_2'] = f'[{chr(icons[clevel])} {consensus}]({href})'
    table[code]['target_2'] = f'{target_price} ({target_p})'

with open('result.md', 'w', encoding='utf-8') as f:
    f.write('# Stocks\n')
    f.write('Last Updated: ' + datetime.now().strftime('%Y-%m-%d %H:%M:%S') + ' UTC\n\n')

    f.write('|Code|Last close|Mean Consensus A|Target price(+) A|Mean Consensus B|Target price(+) B|\n')
    f.write('|:--:|-|-|-|-|-|\n')
    for code in ms_list:
        t = table[code]
        s = [code, t["last_close"], t["consensus_1"], t["target_1"], t["consensus_2"], t["target_2"]]
        f.write('|{}|\n'.format('|'.join(map(str, s))))
