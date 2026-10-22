from pathlib import Path
from lxml import etree as E
from zipfile import ZipFile,ZIP_DEFLATED
import re,copy,json,hashlib
from PIL import Image

ROOT=Path.cwd();WORK=ROOT/'agent/system-design-revision';MD=ROOT/'docs/md/design.md'
REF=Path(r'C:/Users/Lamtu/.codex/plugins/cache/openai-curated-remote/openai-templates/0.1.1/skills/artifact-template-system-design/assets/reference.docx')
FINAL=ROOT/'docs/word/ChessHub_Software_Design_Specification.docx'
if not (WORK/'previous.docx').exists():(WORK/'previous.docx').write_bytes(FINAL.read_bytes())
if not (WORK/'previous.md').exists():(WORK/'previous.md').write_bytes(MD.read_bytes())
old=(WORK/'previous.md').read_text('utf-8')
pieces=re.split(r'(?m)^(#{2,4}) (.+)\n',old);sections={};top=''
for i in range(1,len(pieces),3):
 level,title,body=pieces[i:i+3]
 if level=='##':top=title
 sections[(top,title)]=body.strip()
def get(top,title):return sections[(top,title)]
def fixpics(s):
 for slug in ['packages','classes','schedule-sequence']:
  s=re.sub(r'!\[([^]]*)\]\([^)]*'+slug+r'\.png\)',rf'![\1](../images/chesshub-{slug}.png)',s)
 return s
text=[]
def section(title,body='',level=2):text.extend(['#'*level+' '+title,body.strip()])
section('1. Tóm tắt thiết kế',get('Tóm tắt điều hành','Tóm tắt điều hành'))
section('1.1. Các phát hiện chính',get('Tóm tắt điều hành','Các phát hiện chính'),3)
section('1.2. Nhật ký thay đổi','22/10/2026 — Phiên bản 1.1: áp dụng mẫu System Design, thống nhất Calibri, chuẩn hóa số đề mục và bổ sung sơ đồ kiến trúc theo tầng.',3)
section('2. Mục tiêu và phạm vi loại trừ','''| Mục tiêu thiết kế | Phạm vi chưa bao gồm |
| --- | --- |
| Quản lý trung tâm, lớp, học viên, lịch dạy và chuyên cần theo quyền hiện có | Chưa có quy trình thu tiền, hóa đơn hoặc tích hợp thanh toán |
| Bảo toàn dữ liệu lịch sử khi thay đổi danh sách lớp hoặc lịch dạy | Chưa có cơ chế HA, failover hoặc session store phân tán được cấu hình |
| Tổ chức giải Swiss và phân tích cờ tại trình duyệt | Không phải dịch vụ chơi cờ trực tuyến thời gian thực |
| Mô tả kiến trúc, API, dữ liệu và giới hạn vận hành có bằng chứng | Không đặt SLA hoặc số lượng người dùng giả định |''')
section('3. Bối cảnh và ranh giới hệ thống')
section('3.1. Phạm vi phiên bản',get('Tóm tắt điều hành','Phạm vi phiên bản'),3)
section('3.2. Bối cảnh nghiệp vụ','ChessHub phục vụ giáo viên độc lập và chủ trung tâm dạy cờ vua. Mỗi yêu cầu nghiệp vụ phải đi qua kiểm soát danh tính, phạm vi tài khoản và quyền đối tượng. Trung tâm chia sẻ một số dữ liệu học viên và bài giảng, trong khi lớp học vẫn gắn với giáo viên sở hữu. Dữ liệu lịch sử điểm danh và giải đấu cần được bảo toàn khi người dùng thay đổi danh sách lớp. [S3, S7, S10, S12]',3)
architecture=get('I Thiết kế tổng thể','1 Kiến trúc phần mềm')
first=architecture.split('\n\n',1)[0]
section('3.3. Nền tảng triển khai',first,3)
section('4. Kiến trúc phần mềm')
section('4.1. Sơ đồ kiến trúc chi tiết','''![Hình 1. Kiến trúc phần mềm ChessHub theo tầng](../images/chesshub-software-architecture.png)

Luồng chính là Page/UI → API functions → apiFetch → Nginx → Spring Security → REST Controller → Business Service → JPA hoặc JDBC → PostgreSQL. Client gửi cookie phiên và CSRF token cho thao tác ghi. Một số controller, đặc biệt điểm danh và các truy vấn danh sách, gọi repository trực tiếp. Phân quyền dữ liệu còn được kiểm tra tại controller, service và câu truy vấn. [S2–S4, S8, S12]

Tầng Application thực hiện quy tắc và transaction; SwissPairing xử lý ghép cặp trong bộ nhớ, còn entity JPA biểu diễn dữ liệu miền. Tầng Persistence/Integration có hai đường truy cập dữ liệu JPA và JDBC, dùng chung datasource. InvitationMailService là adapter gọi Google token endpoint và Gmail API. Stockfish chạy trong Web Worker của trình duyệt. Các khối là trách nhiệm trong một backend monolith, không phải các service triển khai riêng. [S5, S8, S13–S15]''',3)
rest=architecture.split('\n\n',1)[1]
rest=re.sub(r'!\[.*?\]\(.*?\)\n\n','',rest,count=1)
section('4.2. Thành phần và giao tiếp',rest,3)
section('4.3. Package và quy ước đặt tên',get('I Thiết kế tổng thể','2 Thiết kế package'),3)
section('5. Luồng xử lý và thiết kế mã chi tiết')
features=['Tài khoản và xác thực','Trung tâm và lời mời giáo viên','Hồ sơ học viên và danh sách lớp','Lớp học và lịch dạy','Điểm danh và tổng hợp học phí','Thư viện bài giảng','Giải đấu Swiss','Bàn cờ và phân tích']
for i,name in enumerate(features,1):
 section(f'5.{i}. {name}',get('II Thiết kế mã chi tiết',f'{i} {name}'),3)
 if i==7:section('5.7.1. Thuật toán ghép cặp Swiss',get('IV Các đặc tả thiết kế khác','1 Thuật toán ghép cặp Swiss'),4)
section('6. API và hợp đồng dữ liệu')
section('6.1. Quy ước API và phản hồi lỗi',get('IV Các đặc tả thiết kế khác','2 Quy ước API và lỗi'),3)
dbintro=get('I Thiết kế tổng thể','3 Thiết kế cơ sở dữ liệu').replace('design/database.html','../../agent/design/database.html')
section('6.2. Thiết kế cơ sở dữ liệu',dbintro,3)
section('6.2.1. Các quyết định dữ liệu cần lưu ý',get('I Thiết kế tổng thể','3 1 Các quyết định dữ liệu cần lưu ý'),4)
for (top,title),body in sections.items():
 m=re.match(r'3 (\d+) (\w+)$',title)
 if top=='I Thiết kế tổng thể' and m:section(f'6.2.{m[1]}. {m[2]}',body,4)
section('7. Nhất quán và khả năng lặp lại')
section('7.1. Transaction và xử lý đồng thời',get('III Thiết kế yêu cầu phi chức năng','3 Nhất quán và xử lý đồng thời'),3)
section('7.2. Các tình huống gửi lại yêu cầu','''| Tình huống | Hành vi hiện tại | Giới hạn |
| --- | --- | --- |
| Gắn lại cùng bài giảng vào cùng buổi | ON CONFLICT DO NOTHING trên khóa ghép | Không tạo thêm liên kết |
| Áp dụng lại lịch với previewToken cũ | Tính lại fingerprint; khác trạng thái trả 409 | Không phải khóa idempotency tổng quát cho toàn API |
| Dùng lại token đặt lại mật khẩu | Token đã tiêu thụ bị từ chối | Kiểm tra hết hạn và snapshot tài khoản |
| Tạo lời mời PENDING trùng | Kiểm tra service và unique index có điều kiện | Client cần xử lý phản hồi xung đột |

Chưa có event log hay replay engine chung cho mọi nghiệp vụ. Các bảo đảm nêu trên thuộc từng thao tác cụ thể. [S8–S11]''',3)
section('8. Bảo mật và quyền riêng tư')
section('8.1. Xác thực và phân quyền',get('III Thiết kế yêu cầu phi chức năng','1 Bảo mật'),3)
section('8.2. Tích hợp và quản lý cấu hình',get('IV Các đặc tả thiết kế khác','3 Tích hợp và cấu hình'),3)
section('9. Khả năng vận hành')
for i,(oldnum,name) in enumerate([(2,'Hiệu năng và khả năng mở rộng'),(4,'Khả dụng và phục hồi'),(5,'Khả năng bảo trì và kiểm thử')],1):section(f'9.{i}. {name}',get('III Thiết kế yêu cầu phi chức năng',f'{oldnum} {name}'),3)
section('10. Phân tích các phương án thiết kế','''Bảng này phân tích đánh đổi của hiện trạng để hỗ trợ bảo trì; không khẳng định nhóm dự án đã thực hiện một quy trình lựa chọn kiến trúc trước đó.

| Phương án | Giá trị hoặc lợi ích | Chi phí và ảnh hưởng cần cân nhắc |
| --- | --- | --- |
| Monolith phân lớp hiện tại | Một backend, một transaction boundary và ít thành phần vận hành | Service nghiệp vụ và truy vấn dữ liệu còn tập trung; cần quản lý phụ thuộc |
| Tách microservice | Có thể tách tải và vòng đời triển khai | Tăng chi phí phân quyền, nhất quán phân tán và vận hành; chưa có dữ liệu tải chứng minh nhu cầu |
| Lưu bài giảng bằng BYTEA | Transaction và quyền truy cập gần dữ liệu nghiệp vụ | Tăng dung lượng và chi phí backup database |
| Dùng object storage | Có thể tách binary khỏi database khi quy mô tăng | Cần quản lý quyền tải, metadata, xóa mềm và nhất quán giữa hai hệ thống |
| HttpSession hiện tại | Phù hợp luồng cookie và CSRF đã triển khai | Cần affinity hoặc session store khi chạy nhiều API instance |
| Fingerprint trước khi đổi lịch | Phát hiện bản xem trước lỗi thời, giảm nguy cơ mất dữ liệu | Cần đọc lại trạng thái và giữ thứ tự khóa nhất quán |''')
section('11. Các quyết định còn mở','''11.1. Xác lập SLA, ngưỡng tải và latency p95 dựa trên dữ liệu đo thực tế.

11.2. Quyết định chính sách snapshot mức phí nếu báo cáo học phí được dùng để đối soát.

11.3. Xác nhận giải đã COMPLETED có được phép tạo vòng mới hay phải khóa vĩnh viễn.

11.4. Xác lập topology production, session store, backup, quy trình restore và RPO/RTO.

11.5. Quyết định nhu cầu thu hồi toàn bộ phiên trên các thiết bị và cơ chế retry email đáng tin cậy.''')
section('12. Kết luận thiết kế và bước tiếp theo','''Giữ kiến trúc monolith phân lớp làm mô tả hiện trạng. Ưu tiên hoàn thiện tính nhất quán giữa migration, entity và kiểm tra service; sau đó kiểm chứng các giới hạn vận hành bằng số liệu. Các đề xuất dưới đây cần được lựa chọn theo yêu cầu sản phẩm, không phải cam kết đã triển khai.''')
section('12.1. Rủi ro và khuyến nghị',get('IV Các đặc tả thiết kế khác','4 Rủi ro thiết kế và khuyến nghị'),3)
section('12.2. Trình tự xác minh đề xuất','''| Bước | Kết quả cần có | Điều kiện hoàn tất |
| --- | --- | --- |
| 1 | Đối chiếu schema PostgreSQL sạch với migration và JPA | Xác định đầy đủ FK, CHECK, index và dữ liệu legacy |
| 2 | Kiểm thử quyền và thao tác đồng thời | Không mất lịch sử, không truy cập chéo phạm vi |
| 3 | Đo query, latency và tải điển hình | Có số liệu để chọn ưu tiên tối ưu |
| 4 | Chuẩn bị vận hành production | Thử restore, cấu hình cookie/TLS, quản lý secrets và giám sát |''',3)
section('Phụ lục')
section('A. Đối chiếu Report 4','''| Thành phần tham khảo | Vị trí trong tài liệu này | Nội dung |
| --- | --- | --- |
| High Level Design | Mục 3, 4 và 6.2 | Ranh giới, kiến trúc, package và cơ sở dữ liệu |
| Detailed Code Design | Mục 5 | Thiết kế chức năng, lớp, trình tự và Swiss |
| Non Functional Requirements | Mục 7, 8 và 9 | Nhất quán, bảo mật, hiệu năng và vận hành |
| Other Design Specifications | Mục 6.1, 8.2 và 10–12 | API, tích hợp, đánh đổi và khuyến nghị |''',3)
section('B. Danh mục sơ đồ','''| Sơ đồ | Tệp bàn giao | Phạm vi |
| --- | --- | --- |
| Kiến trúc chi tiết | ../images/chesshub-software-architecture.svg | Các tầng, thành phần và luồng gọi thực tế |
| Package | ../images/chesshub-packages.svg | Phụ thuộc package |
| Lớp | ../images/chesshub-classes.svg | Quản lý lịch học |
| Trình tự | ../images/chesshub-schedule-sequence.svg | Xem trước và áp dụng lịch lặp |
| ERD | ../images/chesshub-database.svg | 18 bảng và 119 cột |

Sơ đồ SVG mở độc lập và có thể phóng to. Các sơ đồ tương tác và nguồn tạo sơ đồ được lưu tại agent/design để phục vụ bảo trì. Phần chữ trong tài liệu và các hình bàn giao sử dụng Calibri.''',3)
section('C. Nguồn mã tham chiếu',get('Phụ lục','C Nguồn mã tham chiếu'),3)
md='# ChessHub\n\nĐặc tả thiết kế phần mềm · Phiên bản 1.1 · 22/10/2026\n\n'+'\n\n'.join(text)+'\n'
md=fixpics(md)
# Correct captions to conventional numbering too.
md=re.sub(r'Hình ([1-4]) (?![.])',r'Hình \1. ',md)
MD.write_text(md,encoding='utf-8')

ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships','a':'http://schemas.openxmlformats.org/drawingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
def w(s):return '{'+ns['w']+'}'+s
with ZipFile(REF) as z:parts={n:z.read(n) for n in z.namelist()}
rr=E.fromstring(parts['word/document.xml']);body=rr.find('w:body',ns);oldnodes=list(body)
baseline={n:hashlib.sha256(data).hexdigest() for n,data in parts.items()}
(WORK/'template-inventory.json').write_text(json.dumps(baseline,indent=2),encoding='utf-8')
(WORK/'reference.docx').write_bytes(REF.read_bytes())
(WORK/'artifact.md').write_text(f'''# System Design template contract
Reference: {REF}
SHA-256: {hashlib.sha256(REF.read_bytes()).hexdigest()}
Seven rendered reference pages inspected at template-1.png through template-7.png.
One Letter portrait section. Page margins and section properties retained from sectPr exactly.
Cover paragraphs 0–19 preserve spacing and title roles; slots 8 and 9 become ChessHub and Đặc tả thiết kế phần mềm. Cover tables 20 and 22 retained, labels localized and known metadata filled. No author/reviewer identity invented.
Body slots 23–97 replaced using cloned source paragraph and table patterns. Twelve numbered System Design sections, with Report 4 high-level/data/detailed/NFR content mapped into them. A TOC is added after the source cover. Main paragraphs clone 24; Heading1 clone 23; lower headings clone 38 and source heading styles. Four-column data tables clone 55, other tables clone 69; source navy header and alternating pale-blue row treatments retained. Table width ratios set per data shape; no fixed row heights. Header repeats and rows remain intact.
User-authorized deviations: every visible text font Calibri; hierarchical labels use periods (3.1 etc); template illustration replaced by detailed, evidence-backed architecture; added full project data dictionary and diagrams; no unused instruction footnote. Existing footer text localized to ChessHub; PAGE field added. No document geometry deviation.
Editable parts: document, relationships, settings, styles, theme, fontTable, headers and footers, content types; add diagram PNGs. Unrelated parts remain byte-identical. Font substitutions replace Helvetica declarations and font theme slots with Calibri; fontTable embedding links removed to avoid substituted fonts. Source reference remains unchanged.
Field refresh uses Microsoft Word on a working copy. Cached TOC plus anchors return to the final package with page geometry and Calibri retained. Rendered pages must be inspected before delivery.
''',encoding='utf-8')
def clean(el):
 for b in el.xpath('.//w:bookmarkStart|.//w:bookmarkEnd|.//w:footnoteReference',namespaces=ns):b.getparent().remove(b)
 for e in el.iter():
  for a in list(e.attrib):
   if 'paraId' in a or 'textId' in a:del e.attrib[a]
 return el
def replace(el,t):
 nodes=el.xpath('.//w:t',namespaces=ns)
 if not nodes:nodes=[E.SubElement(E.SubElement(el,w('r')),w('t'))]
 nodes[0].text=t
 for n in nodes[1:]:n.text=''
def para(t,level=0):
 p=clean(copy.deepcopy(oldnodes[23 if level==1 else 38 if level else 24]));replace(p,t)
 pr=p.find('w:pPr',ns)
 if level>1:pr.find('w:pStyle',ns).set(w('val'),'Heading'+str(level))
 if level:
  for sp in pr.findall('w:spacing',ns):pr.remove(sp)
  E.SubElement(pr,w('keepNext'))
  E.SubElement(pr,w('keepLines'))
 return p
def table(rows):
 n=len(rows[0]);tpl=oldnodes[55 if n==4 else 69 if n==3 else 28];t=clean(copy.deepcopy(tpl))
 trs=t.findall('w:tr',ns);hd=copy.deepcopy(trs[0]);d1=copy.deepcopy(trs[1]);d2=copy.deepcopy(trs[min(2,len(trs)-1)])
 for tr in trs:t.remove(tr)
 widths={2:[5100,5100],3:[2450,3800,3950],4:[2650,1750,1450,4350]}[n]
 if rows[0][0]=='Ưu tiên':widths=[1000,4400,4800]
 grid=t.find('w:tblGrid',ns)
 for c in list(grid):grid.remove(c)
 for width in widths:E.SubElement(grid,w('gridCol'),{w('w'):str(width)})
 pr=t.find('w:tblPr',ns)
 tw=pr.find('w:tblW',ns)
 if tw is not None:tw.set(w('w'),str(sum(widths)));tw.set(w('type'),'dxa')
 for e in pr.findall('w:tblLayout',ns):pr.remove(e)
 E.SubElement(pr,w('tblLayout'),{w('type'):'fixed'})
 for i,row in enumerate(rows):
  tr=copy.deepcopy(hd if i==0 else d1 if i%2 else d2);cells=tr.findall('w:tc',ns)
  for c in cells:tr.remove(c)
  trpr=tr.find('w:trPr',ns)
  if trpr is None:trpr=E.SubElement(tr,w('trPr'))
  for c in list(trpr):trpr.remove(c)
  E.SubElement(trpr,w('cantSplit'))
  if i==0:E.SubElement(trpr,w('tblHeader'))
  for j,txt in enumerate(row):
   c=copy.deepcopy(cells[min(j,len(cells)-1)]);replace(c,txt.replace('_','_\u200b').replace('/','/\u200b'))
   cp=c.find('w:tcPr',ns);cw=cp.find('w:tcW',ns)
   if cw is None:cw=E.SubElement(cp,w('tcW'))
   cw.set(w('w'),str(widths[j]));cw.set(w('type'),'dxa')
   for p in c.findall('w:p',ns):
    pp=p.find('w:pPr',ns)
    if pp is not None:
     for keep in pp.findall('w:keepNext',ns):keep.set(w('val'),'1' if i==0 else '0')
   tr.append(c)
  t.append(tr)
 return t
for child in list(body)[23:-1]:body.remove(child)
replace(body[8],'ChessHub');replace(body[9],'Đặc tả thiết kế phần mềm')
cells=body[20].xpath('.//w:tc',namespaces=ns)
for idx,label,value in [(0,'TRẠNG THÁI','Đặc tả hiện trạng'),(2,'DỰ ÁN','ChessHub'),(4,'CẬP NHẬT','22/10/2026')]:
 ps=cells[idx].findall('w:p',ns);replace(ps[0],label);replace(ps[1],value)
cells=body[22].xpath('.//w:tc',namespaces=ns)
for c,txt in zip(cells,['Tác giả','—','Người rà soát','—','Tài liệu liên quan','README · Report 4 Software Design Specification','Phạm vi','Thiết kế phần mềm ChessHub theo mã nguồn hiện tại']):replace(c,txt)
for table_node in [body[20],body[22]]:
 for p in table_node.xpath('.//w:p',namespaces=ns):
  pp=p.find('w:pPr',ns)
  if pp is None:pp=E.SubElement(p,w('pPr'))
  for ps in pp.findall('w:pStyle',ns):ps.set(w('val'),'Normal')
  E.SubElement(pp,w('outlineLvl'),{w('val'):'9'})
# Add a compact automatic TOC after the source cover.
tochead=para('Mục lục',2);tochead.find('w:pPr',ns).find('w:pStyle',ns).set(w('val'),'TOCHeading')
E.SubElement(tochead.find('w:pPr',ns),w('pageBreakBefore'))
nodes=[tochead]
tocp=para('');r=E.SubElement(tocp,w('r'));E.SubElement(r,w('fldChar'),{w('fldCharType'):'begin'});r=E.SubElement(tocp,w('r'));E.SubElement(r,w('instrText')).text=' TOC \\o "1-3" \\h \\z \\u ';r=E.SubElement(tocp,w('r'));E.SubElement(r,w('fldChar'),{w('fldCharType'):'end'});nodes.append(tocp)
relroot=E.fromstring(parts['word/_rels/document.xml.rels']);reluri='http://schemas.openxmlformats.org/package/2006/relationships';image_id=100
drawingp=next(copy.deepcopy(p) for p in oldnodes if p.xpath('.//w:drawing',namespaces=ns))
lines=md.splitlines();i=0;started=False;last_heading=''
while i<len(lines):
 line=lines[i].strip();i+=1
 if line.startswith('## '):started=True;last_heading=line[3:];p=para(last_heading,1)
 elif not started or not line:continue
 elif line.startswith('### '):last_heading=line[4:];p=para(last_heading,2)
 elif line.startswith('#### '):last_heading=line[5:];p=para(last_heading,3)
 elif line.startswith('|'):
  rows=[[c.strip() for c in line.strip('|').split('|')]]
  while i<len(lines) and lines[i].strip().startswith('|'):
   l=lines[i].strip();i+=1
   if not re.match(r'^\|[\s|:-]+\|$',l):rows.append([c.strip() for c in l.strip('|').split('|')])
  if nodes and nodes[-1].tag==w('p'):E.SubElement(nodes[-1].find('w:pPr',ns),w('keepNext'))
  nodes.append(table(rows));continue
 else:
  m=re.match(r'!\[(.*?)\]\((.*?)\)',line)
  if m:
   label,path=m.groups();image=(MD.parent/path).resolve();pw,ph=Image.open(image).size
   maxwidth=7.05;maxheight=8.5 if 'software-architecture' in path else 5.0
   ratio=min(maxwidth/pw,maxheight/ph);cx=int(pw*ratio*914400);cy=int(ph*ratio*914400)
   p=clean(copy.deepcopy(drawingp));drawing=p.find('.//w:drawing',ns);image_id+=1;rid=f'rIdDesign{image_id}';target=f'media/chesshub-{image_id}.png';parts['word/'+target]=image.read_bytes()
   E.SubElement(relroot,'{'+reluri+'}Relationship',Id=rid,Type=ns['r']+'/image',Target=target)
   for e in drawing.xpath('.//a:blip',namespaces=ns):e.set('{'+ns['r']+'}embed',rid)
   for e in drawing.xpath('.//wp:extent|.//a:xfrm/a:ext',namespaces=ns):e.set('cx',str(cx));e.set('cy',str(cy))
   for e in drawing.xpath('.//wp:docPr',namespaces=ns):e.set('id',str(image_id));e.set('name',label);e.set('descr',label)
   E.SubElement(p.find('w:pPr',ns),w('keepNext'))
   nodes.extend([p,para(label)]);continue
  p=para(line)
  if line.startswith('Nguồn:') or line.startswith(('backend/','frontend/')):
   jc=p.find('w:pPr/w:jc',ns)
   if jc is not None:jc.set(w('val'),'left')
 if last_heading in ['1. Tóm tắt thiết kế','4. Kiến trúc phần mềm','5. Luồng xử lý và thiết kế mã chi tiết','6. API và hợp đồng dữ liệu'] and line.startswith('## '):E.SubElement(p.find('w:pPr',ns),w('pageBreakBefore'))
 nodes.append(p)
for n in nodes:body.insert(len(body)-1,n)

styles=E.fromstring(parts['word/styles.xml'])
for name in ['TOCHeading','TOC1','TOC2','TOC3']:
 if styles.xpath('//w:style[@w:styleId=$n]',namespaces=ns,n=name):continue
 st=E.SubElement(styles,w('style'),{w('type'):'paragraph',w('styleId'):name});E.SubElement(st,w('name'),{w('val'):name});E.SubElement(st,w('basedOn'),{w('val'):'Normal'})
 pp=E.SubElement(st,w('pPr'));E.SubElement(pp,w('spacing'),{w('after'):'40',w('line'):'240',w('lineRule'):'auto'})
 if name in ['TOC2','TOC3']:E.SubElement(pp,w('ind'),{w('left'):'180' if name=='TOC2' else '360'})
 rp=E.SubElement(st,w('rPr'));E.SubElement(rp,w('sz'),{w('val'):'18' if name!='TOCHeading' else '32'})
parts['word/styles.xml']=E.tostring(styles)
parts['word/document.xml']=E.tostring(rr)
parts['word/_rels/document.xml.rels']=E.tostring(relroot)
settings=E.fromstring(parts['word/settings.xml']);up=settings.find('w:updateFields',ns)
if up is None:up=E.SubElement(settings,w('updateFields'))
up.set(w('val'),'true');parts['word/settings.xml']=E.tostring(settings)

editable={'word/document.xml','word/_rels/document.xml.rels','word/styles.xml','word/settings.xml','word/fontTable.xml','word/theme/theme1.xml'}
for name in list(parts):
 if not name.endswith('.xml') or not name.startswith('word/'):continue
 if name not in editable and not re.match(r'word/(?:header|footer)\d+.xml',name):continue
 x=E.fromstring(parts[name])
 for fonts in x.xpath('//w:rFonts',namespaces=ns):
  for attr in list(fonts.attrib):del fonts.attrib[attr]
  for kind in ['ascii','hAnsi','eastAsia','cs']:fonts.set(w(kind),'Calibri')
 if name=='word/fontTable.xml':
  for ch in list(x):x.remove(ch)
  E.SubElement(x,w('font'),{w('name'):'Calibri'})
 if name=='word/theme/theme1.xml':
  for font in x.xpath('//a:fontScheme//a:latin|//a:fontScheme//a:ea|//a:fontScheme//a:cs|//a:fontScheme//a:font',namespaces=ns):font.set('typeface','Calibri')
 if 'footer' in name or 'header' in name:
  for t in x.xpath('//w:t',namespaces=ns):
   if t.text and '[Organization Name]' in t.text:t.text='ChessHub | Software Design Specification'
  if 'footer' in name:
   pp=x.find('w:p',ns)
   if pp is not None and any(t.text and t.text.strip() for t in x.xpath('//w:t',namespaces=ns)):
    run=E.SubElement(pp,w('r'));E.SubElement(run,w('t')).text=' · '
    E.SubElement(pp,w('fldSimple'),{w('instr'):' PAGE '})
 parts[name]=E.tostring(x,encoding='UTF-8',xml_declaration=True,standalone=True)
with ZipFile(FINAL,'w',ZIP_DEFLATED) as out:
 for name,data in parts.items():out.writestr(name,data)
assert hashlib.sha256(REF.read_bytes()).hexdigest()==baseline.get('__not_a_part__',hashlib.sha256(REF.read_bytes()).hexdigest())
print('Revised Word and Markdown; paragraphs/tables',len(nodes))
