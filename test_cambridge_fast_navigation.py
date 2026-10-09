"""Regression: Cambridge Quiz default exam mode and one-tap results navigation.
Exercises isolated browser storage; does not write real user progress.
"""
from pathlib import Path
import threading, http.server, socketserver
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).parent
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args):pass

class Server(socketserver.TCPServer):
    allow_reuse_address=True

def complete_round(page,total=8):
    for i in range(total):
        page.locator('#skipQuiz').click()
        if i<total-1:page.locator('#quizPosition').filter(has_text=f'{i+2} / {total}').wait_for(timeout=8000)
    page.locator('#quizFinish').wait_for(state='visible',timeout=10000)

with Server(('127.0.0.1',18819),Handler) as server:
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(channel='chrome',headless=True)
        for width,height in [(390,844),(1280,850)]:
            context=browser.new_context(viewport={'width':width,'height':height})
            context.route('https://**/*',lambda route:route.abort())
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            # Only accelerate the existing post-answer transition during tests.
            page.add_init_script("""(()=>{
              const original=window.setTimeout.bind(window);
              window.setTimeout=(callback,delay,...rest)=>original(callback,[850,1000,1300].includes(delay)?20:delay,...rest);
            })();""")
            page.goto('http://127.0.0.1:18819/cambridge-quiz.html',wait_until='domcontentloaded')
            assert page.locator('input[name="quizKind"]').first.get_attribute('value')=='exam'
            assert page.locator('input[name="quizKind"][value="exam"]').is_checked()
            assert page.locator('input[name="quizKind"][value="mixed"]').is_checked() is False
            assert page.locator('#quizExamPicker').is_visible()
            assert page.locator('#examListSection').is_visible()
            assert page.locator('#quizExam option').count()==30
            page.locator('button[data-part="1"]').click()
            assert page.locator('#quizPosition').inner_text()=='1 / 8'
            complete_round(page)
            assert page.locator('#finishExamLabel').text_content().strip()=='Exam 01 · Multiple Choice'
            assert page.locator('#nextExamQuiz').inner_text()=='Siguiente · Exam 02'
            assert page.locator('#repeatQuiz').inner_text()=='Repetir examen'
            assert page.locator('#finishHome').inner_text()=='Elegir examen'
            assert page.evaluate("""()=>{
              let nav=document.querySelector('.finish-quick-actions'),summary=document.querySelector('#finishSummary');
              return nav.getBoundingClientRect().top<summary.getBoundingClientRect().top &&
                     nav.getBoundingClientRect().bottom<innerHeight-12 &&
                     scrollY<5 &&
                     [...nav.querySelectorAll('button')].every(x=>x.getBoundingClientRect().height>=48);
            }"""),'All three navigation actions must be visible above stats without scrolling'
            page.locator('#nextExamQuiz').click()
            assert page.locator('#quizOrigin').inner_text().startswith('EXAM 02')
            complete_round(page)
            page.locator('#repeatQuiz').click()
            assert page.locator('#quizOrigin').inner_text().startswith('EXAM 02')
            complete_round(page)
            page.locator('#finishHome').click()
            assert page.locator('#quizHome').is_visible()
            assert page.locator('#examListSection').is_visible()
            page.locator('input[name="quizKind"][value="mixed"]').check()
            assert page.locator('#quizExamPicker').is_hidden()
            page.locator('button[data-part="1"]').click()
            assert page.locator('#quizPosition').inner_text()=='1 / 15'
            complete_round(page,15)
            assert page.locator('#nextExamQuiz').is_hidden()
            assert page.locator('#repeatQuiz').inner_text()=='Otra ronda'
            assert page.locator('#finishHome').inner_text()=='Cambiar modalidad'
            assert not errors,errors
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), 'Horizontal overflow'
            print(f'PASS {width}px: exam-first, top nav in viewport, next/repeat/choose/mixed, no JS errors, no overflow',flush=True)
            context.close()
        browser.close()
    server.shutdown()
