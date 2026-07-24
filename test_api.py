import requests
import json
resp = requests.post('https://2008.site/payway/api/create-qr', json={'url': 'https://link.payway.com.kh/ABAPAYEA437661K', 'amount': '0.01'})
with open('test_api.json', 'w', encoding='utf-8') as f:
    json.dump(resp.json(), f, indent=2)
