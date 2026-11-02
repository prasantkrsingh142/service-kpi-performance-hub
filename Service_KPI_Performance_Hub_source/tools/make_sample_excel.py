"""Create a small SAMPLE Excel file (made-up data) to try the dashboard without real case data.

Usage:   python tools/make_sample_excel.py [output.xlsx] [market name]
Needs:   pip install openpyxl
"""
import sys, random, datetime
import openpyxl

out = sys.argv[1] if len(sys.argv) > 1 else 'sample_market.xlsx'
market = sys.argv[2] if len(sys.argv) > 2 else 'SampleMarket'

HEAD = ['Case Number', 'CaseType', 'Creation Date', 'CreationTimeStamp', 'Disposition Date', 'Customer ID',
        'ResolutionType', 'Modality', 'IB Region', 'RSE Region', 'Touched By Tier 2', 'Visits',
        '# Parts Consumed', 'Parts Advised List', 'Parts Consumed List',
        'Service Plan Available Before First Visit', 'MonthYear', 'WeekYear',
        'RR Scope', 'RR', 'FVF Scope', 'FVF', 'FTR_PA Scope', 'FTR_PA', 'RDF Scope', 'RDF',
        'Touched by T2', 'RT Scope', 'RT', 'Market']
wb = openpyxl.Workbook(); ws = wb.active; ws.append(HEAD)
random.seed(7)
start = datetime.datetime(2026, 1, 1)
for i in range(3000):
    d = start + datetime.timedelta(days=random.randint(0, 297))
    region = random.choice(['Michigan', 'Dallas', 'Ohio'])
    advised = 'A0-453567012341 (Sample part)'
    consumed = 'A0-1-453567012341 (Sample part) * 1 = 10.00€' if random.random() < .55 else '-'
    ws.append(['-', 'Customer', d, d, d, 'C%d' % i,
               random.choice(['First Visit Fix'] * 3 + ['Multi Visit Fix']), 'MR', region, region, '1', 1,
               int(random.random() < .5), advised, consumed, int(random.random() < .3), d, 'x',
               1, int(random.random() < .45), 1, int(random.random() < .75), 1, int(random.random() < .2),
               1, int(random.random() < .4), str(int(random.random() < .8)), 1, int(random.random() < .78), market])
wb.save(out); print('Saved', out)
