from pathlib import Path
from html import escape as h
import json

root=Path.cwd();out=root/'docs/images';out.mkdir(exist_ok=True)
svg=['''<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1530" viewBox="0 0 1320 1530">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#486581"/></marker></defs>
<style>text{font-family:Calibri,sans-serif;fill:#18354d} .edge{fill:none;stroke:#486581;stroke-width:2.5;stroke-linejoin:round;marker-end:url(#arrow)} .note{font-size:18px;fill:#40556a} .title{font-size:25px;font-weight:700} .sub{font-size:21px} .label{font-size:18px;paint-order:stroke;stroke:white;stroke-width:7px;stroke-linejoin:round}</style>
<rect width="1320" height="1530" fill="white"/>
''']
def text(x,y,lines,cls='sub',anchor='middle',gap=26):
 for i,line in enumerate(lines):svg.append(f'<text class="{cls}" x="{x}" y="{y+i*gap}" text-anchor="{anchor}">{h(line)}</text>')
def group(x,y,w,ht,title,fill,stroke):
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{ht}" rx="12" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
 svg.append(f'<path d="M{x} {y+42}H{x+w}" stroke="{stroke}" stroke-width="1.5"/>')
 text(x+w/2,y+29,[title],'title')
def node(x,y,w,ht,title,lines=(),fill='white'):
 svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{ht}" rx="9" fill="{fill}" stroke="#74889b" stroke-width="1.7"/>')
 text(x+w/2,y+31,[title],'title')
 text(x+w/2,y+60,list(lines),'sub',gap=25)
def edge(points,label=None,at=None,dash=False):
 svg.append('<path class="edge" d="M'+' L'.join(f'{x} {y}' for x,y in points)+'"'+(' stroke-dasharray="8 5"' if dash else '')+'/>')
 if label:text(*at,[label],'label')

group(185,18,1100,330,'CLIENT TIER  •  React 19 SPA / Vite 7','#eef5ff','#8baad2')
node(215,83,270,105,'Page / UI', ['Pages · form · layout','Trạng thái tương tác'])
node(590,83,270,105,'API functions',['api.js · request helpers','classes · students · materials'])
node(965,83,285,105,'Shared HTTP client',['apiFetch · JSON / FormData','credentials · CSRF token'])
node(215,225,270,95,'Chess analysis',['chess.js · Stockfish WASM','Web Worker · UCI'])
svg.append('<rect x="25" y="87" width="105" height="112" rx="10" fill="white" stroke="#74889b" stroke-width="1.7"/>')
svg.append('<circle cx="77" cy="113" r="10" fill="none" stroke="#486581" stroke-width="2"/><path d="M77 123v34m-25-20h50m-25 20-18 25m18-25 18 25" fill="none" stroke="#486581" stroke-width="2"/>')
text(77,225,['Người dùng'],'title');text(77,251,['Trình duyệt'],'note')
edge([(130,137),(215,137)])
edge([(485,137),(590,137)],'gọi hàm',(538,124))
edge([(860,137),(965,137)],'request',(912,124))
edge([(350,188),(350,225)])
text(680,266,['Phân tích cờ chạy tại trình duyệt.'],'note')
text(680,293,['Không gửi yêu cầu tính Stockfish tới API.'],'note')
node(965,385,285,93,'Nginx',['SPA · static assets','Proxy API / OAuth'])
edge([(1108,188),(1108,385)],'REST / JSON',(1192,366))

group(185,525,1100,762,'BACKEND TIER  •  Java 21 / Spring Boot 3.5.6','#f4faf0','#9aba83')
group(203,579,300,562,'API / Presentation','#fff6dc','#dfc679')
group(578,579,300,640,'Application / Domain','#fff0ef','#d7a19d')
group(953,579,310,671,'Persistence / Integration','#f3effa','#b1a1c9')
node(215,644,275,126,'Spring Security',['CORS · CSRF · HttpSession','Remember / InitialPassword','Kiểm tra account path'])
node(215,845,275,114,'REST Controllers',['Request / response records','Kiểm tra quyền và dữ liệu'])
node(215,1030,275,90,'Exception handling',['ApiExceptionHandler · JSON'])
node(590,644,275,152,'Business Services',['Auth · Center · User','Class · Schedule · Student','Material · Tournament'])
node(590,875,275,100,'SwissPairing',['Tối ưu cặp trong bộ nhớ','Ngân sách 100.000'])
node(590,1090,275,102,'Domain Entities',['User · Student · ChessClass','Session · Tournament'])
node(965,644,285,110,'JPA Repositories',['JpaRepository · EntityGraph','Pessimistic lock'])
node(965,842,285,110,'JDBC access',['JdbcTemplate / Named','Center · Student · Material'])
node(965,1025,285,100,'Mail adapter',['InvitationMailService','OAuth refresh · Gmail MIME'])
node(965,1160,285,80,'Datasource',['Hibernate · JDBC driver'])

edge([(1108,478),(1108,500),(352,500),(352,644)],'forward API',(770,489))
edge([(352,770),(352,845)],'qua filter',(401,813))
edge([(490,902),(540,902),(540,720),(590,720)],'gọi service',(536,785))
edge([(865,700),(965,700)],'JPA',(915,686))
edge([(865,755),(920,755),(920,897),(965,897)],'SQL',(920,831))
edge([(728,796),(728,875)],'ghép cặp',(779,846))
edge([(590,768),(558,768),(558,1140),(590,1140)],'entity',(550,1015))
edge([(352,959),(352,1030)],'lỗi API',(398,1000))
# A few controllers (attendance, listing) own repository operations directly.
edge([(490,868),(525,868),(525,815),(940,815),(940,675),(965,675)],'một số truy vấn trực tiếp',(746,807))
edge([(865,776),(900,776),(900,1075),(965,1075)],'gửi mail',(895,1015))
edge([(1250,720),(1273,720),(1273,1195),(1250,1195)])
edge([(1108,952),(1108,1025)],None) if False else None
edge([(1250,920),(1260,920),(1260,1210),(1250,1210)])

group(185,1340,695,150,'EXTERNAL SERVICES','#f6f8fb','#aebbc9')
node(215,1396,280,76,'Google OAuth2',['Chỉ khi có cấu hình'])
node(580,1396,275,76,'Gmail API',['HTTPS · gửi lời mời / reset'])
group(953,1340,310,150,'DATA TIER','#fff7e7','#d9ba76')
node(965,1396,285,76,'PostgreSQL 17',['18 bảng · BYTEA tài liệu'])
edge([(1108,1240),(1108,1396)],'SQL',(1155,1320))
edge([(1020,1125),(1020,1143),(932,1143),(932,1310),(718,1310),(718,1396)],'HTTPS',(823,1300))
edge([(215,1434),(160,1434),(160,704),(215,704)],'OAuth2 nếu bật',(108,573),dash=True)
text(660,1520,['Phạm vi mã nguồn hiện tại • HTTP ở local; HTTPS cần được cấu hình khi triển khai.'],'note')
svg.append('</svg>')
(out/'chesshub-software-architecture.svg').write_text('\n'.join(svg),encoding='utf-8')

sources={
 'Client':['frontend/src/App.jsx','frontend/src/services/api.js','frontend/src/services/stockfishClient.js'],
 'Proxy':['frontend/nginx.conf'],
 'Security':['backend/src/main/java/vn/chesshub/config/SecurityConfig.java'],
 'Controller':['backend/src/main/java/vn/chesshub/controller/ChessClassController.java','backend/src/main/java/vn/chesshub/controller/AttendanceController.java','backend/src/main/java/vn/chesshub/controller/ApiExceptionHandler.java'],
 'Application':['backend/src/main/java/vn/chesshub/service/ClassScheduleService.java','backend/src/main/java/vn/chesshub/service/TournamentService.java','backend/src/main/java/vn/chesshub/service/SwissPairing.java'],
 'Persistence':['backend/src/main/java/vn/chesshub/repository/ChessClassRepository.java','backend/src/main/java/vn/chesshub/service/TeachingMaterialService.java'],
 'Integration':['backend/src/main/java/vn/chesshub/service/InvitationMailService.java','backend/src/main/java/vn/chesshub/config/GoogleOAuthConfig.java'],
 'Database':['docker-compose.yml','backend/src/main/resources/application.yml']}
for paths in sources.values():assert all((root/p).exists() for p in paths)
(root/'agent/system-design-revision/architecture-evidence.json').write_text(json.dumps({'revision':'b7fab523739b79af2e26fba0e92e533fa7cd3b6e','sources':sources,'review':{'value':'Expose actual layered call paths and direct controller repository calls.','cost':'Documentation and vector assets only; no application changes.','impact':'Replaces the former coarse overview; keeps JPA and JDBC responsibilities distinct.'}},indent=2),encoding='utf-8')
print('Detailed architecture SVG created')
