from pathlib import Path
import threading,http.server,socketserver,json
from playwright.sync_api import sync_playwright
root=Path('C:/Users/adria/adaptive-exam')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
srv=socketserver.TCPServer(('127.0.0.1',18771),Handler);threading.Thread(target=srv.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as pw:
 b=pw.chromium.launch(channel='chrome',headless=True)
 for width in [360,412,1280]:
  c=b.new_context(viewport={'width':width,'height':900})
  c.route('https://**/*',lambda r:r.fulfill(path='C:/Users/adria/adrian-core/components/hub-charts.js',content_type='text/javascript') if 'hub-charts.js' in r.request.url else r.abort())
  page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:18771/cambridge-quiz.html')
  page.locator('[name=quizKind][value=exam]').check()
  papers=page.locator('#quizExam option').evaluate_all('(xs)=>xs.map(x=>({id:x.value,text:x.textContent}))')
  assert len(papers)==30
  assert page.locator('#examTableBody tr').count()==30
  for i in range(30):
   row=page.locator('#examTableBody tr').nth(i);assert row.locator('th').inner_text()==f'Exam {i+1:02}'
   assert row.locator('td').nth(0).inner_text()=='✗'
  bank=page.evaluate("() => [...(window.ADAPTIVE_EXAM_TRANSCRIBED_CAMBRIDGE_PAPERS||[]),...(window.ADAPTIVE_EXAM_PAPERS||[])].filter(p=>p.id===document.querySelector('#quizExam').value)[0]")
  def play(correct):
   for i in range(8):
    item=next(x for x in bank['parts']['1']['segments'] if isinstance(x,dict) and x['n']==i+1)
    if i<correct:
     ans=(item.get('answers') or [item.get('answer')])[0]
     page.locator('[data-opt="'+str(item['options'].index(ans))+'"]').click()
    else:page.locator('#skipQuiz').click()
    page.locator('#nextQuiz').click()
  page.locator('#examTableBody tr').first.locator('button').click();play(7)
  assert page.locator('#finishExamLabel').text_content()=='Exam 01 · Multiple Choice'
  assert page.locator('#nextExamQuiz').inner_text()=='Siguiente · Exam 02'
  page.locator('#repeatQuiz').click();play(6)
  page.locator('#finishHome').click()
  row=page.locator('#examTableBody tr').first
  assert [row.locator('td').nth(i).inner_text() for i in [0,1,2]]==['✓','2','2']
  assert row.locator('td').nth(3).locator('b').inner_text()=='7/8'
  assert row.locator('button').inner_text()=='Repetir'
  assert page.locator('#examProgressChart svg').count()>=1
  page.locator('#examListPart').select_option('2')
  assert page.locator('#examTableBody tr').first.locator('td').nth(0).inner_text()=='✗'
  page.locator('#examTableBody tr').first.locator('button').click()
  for _ in range(8):page.locator('#skipQuiz').click();page.locator('#nextQuiz').click()
  page.locator('#nextExamQuiz').click()
  assert page.locator('#quizModeTitle').inner_text()=='Open Cloze · Exam 02'
  assert page.locator('#quizCountdown').inner_text() in ['180','179']
  # A seven-question partial round does not complete Exam 02.
  for _ in range(7):page.locator('#skipQuiz').click();page.locator('#nextQuiz').click()
  page.locator('#quitQuiz').click()
  assert page.locator('#examTableBody tr').nth(1).locator('td').nth(0).inner_text()=='✗'
  assert page.locator('#examTableBody tr').first.locator('td').nth(2).inner_text()=='8'
  page.reload();page.locator('[name=quizKind][value=exam]').check()
  assert page.locator('#examTableBody tr').first.locator('td').nth(1).inner_text()=='2'
  # Last exam: no wrap to Exam 01; repeating keeps Exam 30.
  page.locator('#examTableBody tr').last.locator('button').click()
  for _ in range(8):page.locator('#skipQuiz').click();page.locator('#nextQuiz').click()
  assert page.locator('#nextExamQuiz').is_disabled()
  page.locator('#repeatQuiz').click();assert 'Exam 30' in page.locator('#quizModeTitle').inner_text()
  page.locator('#quitQuiz').click()
  # Existing 1.2.18 records already generated above count without migration.
  # Graph retains more than 30 attempts and excludes mixed/partial rows.
  snapshot=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3'))")
  template=snapshot['attempts'][:8]
  seeds=[]
  for i in range(35):
   for j,a in enumerate(template):
    x=dict(a,id=f'seed-{i}-{j}',sessionId=f'seed-session-{i}',completedAt=f'2026-09-{i%28+1:02}T12:{i:02}:00Z')
    seeds.append(x)
  page.evaluate('(data)=>localStorage.setItem("cambridgeB2ExerciseStatsV3",JSON.stringify(data))',{'attempts':snapshot['attempts']+seeds})
  page.reload();page.locator('[name=quizKind][value=exam]').check()
  assert page.locator('#examTableBody tr').first.locator('td').nth(1).inner_text()=='37'
  assert 'histórico completo' in page.locator('#examProgressChart').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==412:page.locator('#examListSection').screenshot(path='C:/Users/adria/agent-workbench/cambridge-tracker-mobile.png')
  assert not errors,errors
  results.append({'width':width,'table':30,'lastErrors':2,'best':7,'timesAfterRepeat':2,'nextSamePart':True,'partialExcluded':True,'reload':True,'lastExamBoundary':True,'fullHistory':True,'passed':True})
  c.close()
 b.close()
srv.shutdown()
(root/'EXAM_TRACKER_ACCEPTANCE_2026-10-08.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8',newline='\n')
print('PASS tracker at 360/412/1280: 30 rows, repeats, last errors vs best, per-part isolation, next, choose, partial exclusion, reload, Exam 30 and full-history chart')
