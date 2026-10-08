from pathlib import Path
import threading,http.server,socketserver,json
from playwright.sync_api import sync_playwright
root=Path('C:/Users/adria/adaptive-exam')
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
srv=socketserver.TCPServer(('127.0.0.1',18769),Handler)
threading.Thread(target=srv.serve_forever,daemon=True).start()
results=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(channel='chrome',headless=True)
 for width in [412,1280]:
  ctx=browser.new_context(viewport={'width':width,'height':900})
  ctx.route('https://**/*',lambda r:r.abort())
  page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script('window.testOffset=0;const realNow=performance.now.bind(performance);performance.now=()=>realNow()+window.testOffset;')
  page.goto('http://127.0.0.1:18769/cambridge-quiz.html')
  assert page.locator('[value=recommended]').is_checked()
  page.locator('.timing-advice summary').click()
  assert page.locator('tbody tr').count()==9
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  if width==412:page.screenshot(path='C:/Users/adria/agent-workbench/cambridge-timing-mobile.png',full_page=True)
  for mode in ['recommended','exam','untimed']:
   for part in [1,2,3]:
    page.locator('[value='+mode+']').check()
    page.locator('[data-part="'+str(part)+'"]').click()
    want='∞' if mode=='untimed' else str(180 if mode=='recommended' else {1:53,2:53,3:45}[part])
    assert page.locator('#quizCountdown').inner_text()==want
    page.evaluate('window.testOffset+=181000');page.wait_for_timeout(220)
    if mode=='untimed':
     assert page.locator('#quizFeedback').is_hidden()
     if part==1:page.locator('[data-opt="0"]').click()
     else:page.locator('#quizInput').fill('test');page.locator('#submitQuiz').click()
    else:assert page.locator('#quizFeedback').is_visible()
    before=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.length")
    page.wait_for_timeout(220)
    assert before==page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.length")
    for _ in range(14):
     page.locator('#nextQuiz').click();page.locator('#skipQuiz').click()
    page.locator('#nextQuiz').click();assert page.locator('#quizFinish').is_visible()
    attempts=page.evaluate("JSON.parse(localStorage.getItem('cambridgeB2ExerciseStatsV3')).attempts.slice(-15)")
    assert all(a['timingMode']==mode for a in attempts)
    assert all(isinstance(a['durationSec'],(float,int)) for a in attempts)
    if mode=='untimed':assert attempts[0]['durationSec']>=181 and attempts[0]['timeLimitSec'] is None
    page.locator('#finishHome').click()
    results.append({'width':width,'mode':mode,'part':part,'round':15,'passed':True})
   page.reload();assert page.locator('[value='+mode+']').is_checked()
  assert not errors,errors
  ctx.close()
 browser.close()
srv.shutdown()
(root/'TIMING_ACCEPTANCE_2026-10-08.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
print('PASS: 18 full rounds, mobile/desktop, timeout once, untimed, persistence, table and no overflow')
