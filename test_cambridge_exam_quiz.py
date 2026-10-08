from pathlib import Path
import threading,http.server,socketserver,json,re
from playwright.sync_api import sync_playwright
root=Path('C:/Users/adria/adaptive-exam')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
srv=socketserver.TCPServer(('127.0.0.1',18770),Handler);threading.Thread(target=srv.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True)
 for width in [412,1280]:
  c=b.new_context(viewport={'width':width,'height':900})
  c.route('https://**/*',lambda r:r.abort())
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('window.testOffset=0;const realNow=performance.now.bind(performance);performance.now=()=>realNow()+window.testOffset;')
  page.goto('http://127.0.0.1:18770/cambridge-quiz.html')
  page.locator('[name=quizKind][value=exam]').check()
  assert page.locator('#quizExam option').count()==30
  bank=page.evaluate("() => [...(window.ADAPTIVE_EXAM_TRANSCRIBED_CAMBRIDGE_PAPERS||[]),...(window.ADAPTIVE_EXAM_PAPERS||[])].filter(p=>p.examNumber>=1&&p.examNumber<=30&&p.parts['1']?.segments)")
  assert len(bank)==30
  for paper in bank:
   for part in [1,2,3]:
    items=[x for x in paper['parts'][str(part)]['segments'] if isinstance(x,dict)]
    assert len(items)==8
    assert len(set(x['n'] for x in items))==8
  if width==412:page.screenshot(path='C:/Users/adria/agent-workbench/cambridge-exam-picker.png',full_page=True)
  for kind in ['mixed','exam']:
   page.locator('[name=quizKind][value='+kind+']').check()
   for mode in ['recommended','exam','untimed']:
    page.locator('[name=quizTiming][value='+mode+']').check()
    for part in [1,2,3]:
     paper=bank[0 if mode=='recommended' else 10 if mode=='exam' else 29]
     if kind=='exam':page.locator('#quizExam').select_option(paper['id'])
     page.locator('[data-part="'+str(part)+'"]').click();n=8 if kind=='exam' else 15
     assert page.locator('#quizPosition').inner_text()==f'1 / {n}'
     assert page.locator('#quizExamScore').inner_text()==f'Exam points: 0 / {n}'
     expect='∞' if mode=='untimed' else str(180 if mode=='recommended' else {1:53,2:53,3:45}[part])
     assert page.locator('#quizCountdown').inner_text()==expect
     observed=[];prior=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')||'{\"attempts\":[]}').attempts.length")
     for i in range(n):
      origin=page.locator('#quizOrigin').inner_text();numbers=[int(x) for x in re.findall(r'\d+',origin)]
      exam,qn=numbers;observed.append(qn)
      if kind=='exam':assert exam==int(paper['examNumber'])
      actual=next(p for p in bank if int(p['examNumber'])==exam)
      item=next(x for x in actual['parts'][str(part)]['segments'] if isinstance(x,dict) and int(x['n'])==qn)
      if i==1:
       if mode=='untimed':
        page.evaluate('window.testOffset+=181000');page.wait_for_timeout(160);assert page.locator('#quizFeedback').is_hidden();page.locator('#skipQuiz').click()
       else:
        page.evaluate('window.testOffset+=181000');page.wait_for_timeout(180);assert page.locator('#quizFeedback').is_visible()
      else:
       answer=(item.get('answers') or [item.get('answer')])[0]
       if part==1:page.locator('[data-opt="'+str(item['options'].index(answer))+'"]').click()
       else:page.locator('#quizInput').fill(answer);page.locator('#submitQuiz').click()
      assert page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.length")==prior+i+1
      if width==412 and kind=='exam' and mode=='recommended' and part==1 and i==0:page.screenshot(path='C:/Users/adria/agent-workbench/cambridge-exam-scores.png',full_page=True)
      page.locator('#nextQuiz').click()
     assert page.locator('#quizFinish').is_visible()
     assert page.locator('#finishTitle').inner_text()==f'{n-1} / {n} correctas'
     metrics=page.locator('#finishSummary').inner_text();assert 'Exam points'.upper() in metrics.upper() and 'Game points'.upper() in metrics.upper()
     if kind=='exam':assert observed==sorted(observed) and len(set(observed))==8
     attempts=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.slice(-"+str(n)+")")
     assert all(a['roundSize']==n and a['quizKind']==kind and a['examMaxPoints']==1 for a in attempts)
     assert sum(a['examPoints'] for a in attempts)==n-1
     if mode=='untimed':assert all(a['quizPoints']==(100 if a['correct'] else 0) for a in attempts)
     else:assert all(100<=a['quizPoints']<=150 for a in attempts if a['correct'])
     page.locator('#repeatQuiz').click();assert page.locator('#quizPosition').inner_text()==f'1 / {n}'
     if kind=='exam':assert page.locator('#quizOrigin').inner_text().endswith('QUESTION '+str(observed[0]))
     page.locator('#quitQuiz').click()
     results.append({'width':width,'kind':kind,'mode':mode,'part':part,'questions':n,'passed':True})
  # All 36 complete rounds count, including the 8-question rounds; aborted repeats do not.
  text=page.locator('#quizHomeStats').inner_text();assert '18' in text,text
  count=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.length")
  page.reload();assert count==page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.length")
  assert page.locator('[name=quizTiming][value=untimed]').is_checked()
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  c.close()
 b.close()
srv.shutdown()
(root/'EXAM_QUIZ_ACCEPTANCE_2026-10-08.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print('PASS: 36 full rounds; all 30 exams x 3 parts have 8 unique questions; scoring, order, repeat, timeout, history and reload')
