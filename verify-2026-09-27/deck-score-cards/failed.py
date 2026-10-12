import json, sys
r = json.load(open(sys.argv[1], encoding='utf-8'))
print(f"total {r['numTotalTests']} passed {r['numPassedTests']} failed {r['numFailedTests']} files {len(r['testResults'])}")
for f in r['testResults']:
    for a in f['assertionResults']:
        if a['status'] == 'failed':
            msg = (a.get('failureMessages') or [''])[0].splitlines()[0][:160]
            print(f"FAIL {f['name'].split('__tests__/')[-1]} :: {a['fullName']} :: {msg}")
    if f['status'] == 'failed' and not f['assertionResults']:
        print(f"FILE-FAIL {f['name']} :: {f.get('message','')[:200]}")
