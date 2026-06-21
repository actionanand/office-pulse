import{b as ee}from"./chunk-OXSTMZDQ.js";import{a as te}from"./chunk-ZGBUUAZF.js";import{l as ne,m as ae,p as oe}from"./chunk-C4EH2FGG.js";import"./chunk-2KWDE274.js";import"./chunk-A24NOBRW.js";import{Ab as m,Lb as q,Mb as U,Na as c,Nb as d,Ob as D,Pb as R,U as J,Z as I,_a as L,ca as p,cc as S,da as f,fc as B,gc as Q,jb as b,kb as M,ma as P,mb as K,nb as z,ob as V,pb as x,qb as i,rb as o,sb as Z,sc as X,wb as $,yb as h}from"./chunk-VQDOG7LY.js";var W=class r{snackbarService=I(te);generatePdf(t,e){let{title:n,rows:a,monthSummaries:l}=this.prepareData(t,e),g=this.generateHtml(n,a,e,l),s=this.generateAndroidPayload(n,a,e,l);this.downloadPdf(g,this.generateFileName(e),s)}prepareData(t,e){let n=this.generateTitle(e),a=this.getDateRange(e),l=this.groupByDateLatestOnly(t),g=[],s=new Date(a.start),_=new Date(a.end);for(;s<=_;){let C=this.formatDateKey(s),w=s.getDay(),v=w===0||w===6,u=l.get(C),N=u?.status==="Day Off",E=v||N,F=!!u,k=!F&&!v,Y=!1;switch(e.daysToInclude){case"entries-only":Y=F;break;case"include-weekends":Y=F||v;break;case"all-days":Y=!0;break}Y&&g.push({date:this.formatDisplayDate(s),dayName:this.getDayName(s),entryTime:E||k?"-":this.formatTime(u?.entryTime),exitTime:E||k?"-":this.formatTime(u?.exitTime),duration:E||k?"-":u?.duration||"-",companyName:u?.companyName||"-",comments:u?.comments||"-",status:v?"Weekend":k?"No Entry":u?.status||"-",isWeekOff:E,isNoEntry:k,month:s.getMonth()+1,year:s.getFullYear()}),s.setDate(s.getDate()+1)}let y=this.calculateMonthSummaries(g);return{title:n,rows:g,monthSummaries:y}}calculateMonthSummaries(t){let e=new Map;return t.forEach(n=>{if(!n.month||!n.year)return;let a=`${n.year}-${n.month}`;e.has(a)||e.set(a,{month:n.month,year:n.year,monthName:new Date(n.year,n.month-1).toLocaleString("en-US",{month:"long",year:"numeric"}),workingDays:0,totalMinutes:0});let l=e.get(a);if(!n.isWeekOff&&!n.isNoEntry&&(l.workingDays++,n.duration&&n.duration!=="-")){let g=n.duration.match(/(\d+)h\s*(\d+)m/);g&&(l.totalMinutes+=parseInt(g[1])*60+parseInt(g[2]))}}),Array.from(e.values()).sort((n,a)=>n.year!==a.year?n.year-a.year:n.month-a.month)}generateTitle(t){let e=t.selectedYear,n=new Date;switch(t.dateRangeType){case"full-year":return`InOut Logs for Year ${e}`;case"current-month":return`InOut Logs for ${n.toLocaleString("en-US",{month:"long"})} ${n.getFullYear()}`;case"previous-month":{let a=n.getMonth()-1,l=a<0?n.getFullYear()-1:n.getFullYear(),g=a<0?11:a;return`InOut Logs for ${new Date(l,g).toLocaleString("en-US",{month:"long"})} ${l}`}case"single-month":{let a=t.selectedMonth||new Date().getMonth()+1;return`InOut Logs for ${new Date(e,a-1).toLocaleString("en-US",{month:"long"})} ${e}`}default:return"InOut Logs"}}getDateRange(t){let e=t.selectedYear,n=new Date;switch(t.dateRangeType){case"full-year":return{start:new Date(e,0,1),end:new Date(e,11,31)};case"current-month":{let a=n.getMonth();return{start:new Date(n.getFullYear(),a,1),end:new Date(n.getFullYear(),a+1,0)}}case"previous-month":{let a=n.getMonth()-1,l=a<0?n.getFullYear()-1:n.getFullYear(),g=a<0?11:a;return{start:new Date(l,g,1),end:new Date(l,g+1,0)}}case"single-month":{let a=(t.selectedMonth||1)-1;return{start:new Date(e,a,1),end:new Date(e,a+1,0)}}default:return{start:new Date(e,0,1),end:new Date(e,11,31)}}}generateHtml(t,e,n,a){let l=this.getTableHeaders(n),g=n.dateRangeType==="full-year";return`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${t}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #667eea;
    }
    .header h1 {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #7f8c8d;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 11px;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    tr:hover {
      background-color: #f0f0f0;
    }
    .week-off {
      background-color: #fff3e0 !important;
      color: #e65100;
    }
    .week-off td {
      font-style: italic;
    }
    .no-entry {
      background-color: #ffebee !important;
      color: #c62828;
    }
    .no-entry td {
      font-style: italic;
    }
    .date-col {
      white-space: nowrap;
      font-weight: 500;
    }
    .day-col {
      color: #7f8c8d;
    }
    .time-col {
      font-family: 'Courier New', monospace;
      white-space: nowrap;
    }
    .duration-col {
      font-weight: 600;
      color: #27ae60;
    }
    .status-col {
      font-size: 10px;
    }
    .comments-col {
      max-width: 150px;
      word-wrap: break-word;
    }
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #7f8c8d;
      font-size: 10px;
    }
    .summary {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 8px;
      flex-wrap: wrap;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 10px;
      color: #7f8c8d;
    }
    .summary-value {
      font-size: 16px;
      font-weight: 700;
      color: #667eea;
    }
    .month-section {
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .month-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 15px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .month-title {
      font-size: 14px;
      font-weight: 700;
    }
    .month-stats {
      display: flex;
      gap: 20px;
      font-size: 11px;
    }
    .month-stat {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .month-stat-value {
      font-weight: 700;
    }
    .yearly-summary {
      margin-top: 25px;
      padding: 15px;
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    }
    .yearly-summary h3 {
      margin-bottom: 10px;
      color: #2e7d32;
      font-size: 14px;
    }
    .yearly-summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }
    .yearly-summary-item {
      background: white;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    .yearly-summary-label {
      font-size: 10px;
      color: #7f8c8d;
    }
    .yearly-summary-value {
      font-size: 18px;
      font-weight: 700;
      color: #2e7d32;
    }
    @media print {
      body { padding: 10px; }
      .header { margin-bottom: 15px; }
      th, td { padding: 6px; }
      .month-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t}</h1>
    <p class="subtitle">Generated on ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
  </div>

  ${this.generateOverallSummary(e,a)}

  ${g?this.generateMonthWiseTables(e,n,l,a):this.generateSingleTable(e,n,l)}

  ${g?this.generateYearlySummary(a,n.selectedYear):""}

  <div class="footer">
    <p>Office Pulse - Attendance Tracker</p>
  </div>
</body>
</html>`}generateOverallSummary(t,e){let n=t.filter(y=>!y.isWeekOff&&!y.isNoEntry).length,a=t.filter(y=>y.isWeekOff).length,l=t.filter(y=>y.isNoEntry).length,g=e.reduce((y,C)=>y+C.totalMinutes,0),s=Math.floor(g/60),_=g%60;return`
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${n}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${a}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      ${l>0?`
      <div class="summary-item">
        <div class="summary-value">${l}</div>
        <div class="summary-label">No Entry Days</div>
      </div>
      `:""}
      <div class="summary-item">
        <div class="summary-value">${s}h ${_}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`}generateSingleTable(t,e,n){return`
    <table>
      <thead>
        <tr>
          ${n.map(a=>`<th>${a}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${t.map(a=>this.generateTableRow(a,e)).join("")}
      </tbody>
    </table>`}generateMonthWiseTables(t,e,n,a){let l=new Map;t.forEach(s=>{if(!s.month||!s.year)return;let _=`${s.year}-${s.month}`;l.has(_)||l.set(_,[]),l.get(_).push(s)});let g="";return a.forEach(s=>{let _=`${s.year}-${s.month}`,y=l.get(_)||[];if(y.length===0)return;let C=Math.floor(s.totalMinutes/60),w=s.totalMinutes%60;g+=`
      <div class="month-section">
        <div class="month-header">
          <span class="month-title">\u{1F4C5} ${s.monthName}</span>
          <div class="month-stats">
            <span class="month-stat">
              <span>Days:</span>
              <span class="month-stat-value">${s.workingDays}</span>
            </span>
            <span class="month-stat">
              <span>Hours:</span>
              <span class="month-stat-value">${C}h ${w}m</span>
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${n.map(v=>`<th>${v}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${y.map(v=>this.generateTableRow(v,e)).join("")}
          </tbody>
        </table>
      </div>`}),g}generateYearlySummary(t,e){let n=t.reduce((C,w)=>C+w.workingDays,0),a=t.reduce((C,w)=>C+w.totalMinutes,0),l=Math.floor(a/60),g=a%60,s=n>0?Math.round(a/n):0,_=Math.floor(s/60),y=s%60;return`
    <div class="yearly-summary">
      <h3>\u{1F4CA} Yearly Summary - ${e}</h3>
      <div class="yearly-summary-grid">
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${n}</div>
          <div class="yearly-summary-label">Total Working Days</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${l}h ${g}m</div>
          <div class="yearly-summary-label">Total Hours Worked</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${_}h ${y}m</div>
          <div class="yearly-summary-label">Avg Hours/Day</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${t.length}</div>
          <div class="yearly-summary-label">Months with Entries</div>
        </div>
      </div>
    </div>`}generateSummary(t){let e=t.filter(s=>!s.isWeekOff&&!s.isNoEntry).length,n=t.filter(s=>s.isWeekOff).length,a=0;t.forEach(s=>{if(!s.isWeekOff&&s.duration&&s.duration!=="-"){let _=s.duration.match(/(\d+)h\s*(\d+)m/);_&&(a+=parseInt(_[1])*60+parseInt(_[2]))}});let l=Math.floor(a/60),g=a%60;return`
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${e}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${n}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${l}h ${g}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`}getTableHeaders(t){let e=["Date","Day","Entry Time","Exit Time","Duration"];return t.includeCompanyName&&e.push("Company"),t.includeStatus&&e.push("Status"),t.includeComments&&e.push("Comments"),e}generateTableRow(t,e){let n="";t.isWeekOff?n="week-off":t.isNoEntry&&(n="no-entry");let a=`
      <td class="date-col">${t.date}</td>
      <td class="day-col">${t.dayName}</td>
      <td class="time-col">${t.entryTime}</td>
      <td class="time-col">${t.exitTime}</td>
      <td class="duration-col">${t.duration}</td>
    `;return e.includeCompanyName&&(a+=`<td>${t.companyName}</td>`),e.includeStatus&&(a+=`<td class="status-col">${t.status}</td>`),e.includeComments&&(a+=`<td class="comments-col">${t.comments}</td>`),`<tr class="${n}">${a}</tr>`}generateAndroidPayload(t,e,n,a){let l=this.getTableHeaders(n),g=n.dateRangeType==="full-year",s=a.reduce((u,N)=>u+N.totalMinutes,0),_=Math.floor(s/60),y=s%60,C=e.filter(u=>u.isNoEntry).length,w=[{label:"Working Days",value:String(e.filter(u=>!u.isWeekOff&&!u.isNoEntry).length)},{label:"Week Offs",value:String(e.filter(u=>u.isWeekOff).length)},...C>0?[{label:"No Entry Days",value:String(C)}]:[],{label:"Total Hours",value:`${_}h ${y}m`}],v=g?a.map(u=>{let N=e.filter(k=>k.month===u.month&&k.year===u.year),E=Math.floor(u.totalMinutes/60),F=u.totalMinutes%60;return{title:u.monthName,stats:[{label:"Days",value:String(u.workingDays)},{label:"Hours",value:`${E}h ${F}m`}],rows:N.map(k=>this.toAndroidRow(k,n))}}).filter(u=>u.rows.length>0):[{title:"Entries",stats:[],rows:e.map(u=>this.toAndroidRow(u,n))}];return JSON.stringify({title:t,generatedOn:new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),summary:w,headers:l,sections:v})}toAndroidRow(t,e){let n=[t.date,t.dayName,t.entryTime,t.exitTime,t.duration];return e.includeCompanyName&&n.push(t.companyName||"-"),e.includeStatus&&n.push(t.status||"-"),e.includeComments&&n.push(t.comments||"-"),{state:t.isWeekOff?"week-off":t.isNoEntry?"no-entry":"normal",cells:n}}generateFileName(t){let e=t.selectedYear;switch(t.dateRangeType){case"full-year":return`inout_logs_${e}`;case"current-month":case"previous-month":case"single-month":{let n=t.selectedMonth||new Date().getMonth()+1;return`inout_logs_${new Date(e,n-1).toLocaleString("en-US",{month:"short"})}_${e}`}default:return"inout_logs"}}downloadPdf(t,e,n){let a=window.Capacitor,l=a?.Plugins?.OfficePulseExport;if(a?.isNativePlatform?.()===!0&&a.getPlatform?.()==="android"){if(!l){this.snackbarService.error("PDF download is not available in this Android build");return}this.snackbarService.success("Preparing PDF export");let _=l.exportPdf({filename:`${e}.pdf`,content:n,html:t,title:"Office Pulse PDF Export"}),y=0,C=new Promise((w,v)=>{y=window.setTimeout(()=>v(new Error("PDF export timed out")),2e4)});_.then(()=>window.clearTimeout(y),()=>window.clearTimeout(y)),Promise.race([_,C]).then(()=>this.snackbarService.success("Choose an app to save or share the PDF")).catch(()=>this.snackbarService.error("Unable to download PDF"));return}let s=window.open("","_blank");if(!s){this.snackbarService.error("Please allow popups to download PDF");return}s.document.write(t),s.document.close(),s.onload=()=>{setTimeout(()=>{s.print()},250)}}formatDateKey(t){let e=t.getFullYear(),n=String(t.getMonth()+1).padStart(2,"0"),a=String(t.getDate()).padStart(2,"0");return`${e}-${n}-${a}`}formatDisplayDate(t){return t.toLocaleDateString("en-US",{month:"short",day:"numeric"})}getDayName(t){return t.toLocaleDateString("en-US",{weekday:"short"})}formatTime(t){if(!t)return"-";try{let e=new Date(t);return isNaN(e.getTime())?"-":e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:!0})}catch{return"-"}}groupByDateLatestOnly(t){let e=new Map;return t.forEach(n=>{if(!n.date)return;let a=e.get(n.date);if(!a)e.set(n.date,n);else{let l=new Date(a.timestamp||a.entryTime).getTime();new Date(n.timestamp||n.entryTime).getTime()>l&&e.set(n.date,n)}}),e}static \u0275fac=function(e){return new(e||r)};static \u0275prov=J({token:r,factory:r.\u0275fac,providedIn:"root"})};var se=(r,t)=>t.value;function ce(r,t){if(r&1&&(i(0,"option",32),d(1),o()),r&2){let e=t.$implicit;x("value",e),c(),D(e)}}function me(r,t){if(r&1){let e=$();i(0,"div",29)(1,"label",30),d(2,"Year"),o(),i(3,"select",31),h("change",function(a){p(e);let l=m(3);return f(l.onYearChange(a.target.value))}),z(4,ce,2,2,"option",32,K),o()()}if(r&2){let e=m(3);c(3),x("value",e.selectedYear()),c(),V(e.availableYears())}}function ge(r,t){if(r&1&&(i(0,"option",32),d(1),o()),r&2){let e=t.$implicit;x("value",e.value),c(),D(e.label)}}function ue(r,t){if(r&1){let e=$();i(0,"div",29)(1,"label",33),d(2,"Month"),o(),i(3,"select",34),h("change",function(a){p(e);let l=m(3);return f(l.onMonthChange(a.target.value))}),z(4,ge,2,2,"option",32,se),o()()}if(r&2){let e=m(3);c(3),x("value",e.selectedMonth()),c(),V(e.months)}}function pe(r,t){if(r&1&&(i(0,"div",16),b(1,me,6,1,"div",29),b(2,ue,6,1,"div",29),o()),r&2){let e=m(2);c(),M(e.showYearSelector()?1:-1),c(),M(e.showMonthSelector()?2:-1)}}function fe(r,t){if(r&1){let e=$();i(0,"div",1),h("click",function(a){p(e);let l=m();return f(l.onOverlayClick(a))})("keyup.escape",function(){p(e);let a=m();return f(a.onClose())}),i(1,"div",2)(2,"div",3)(3,"h2",4),d(4,"\u{1F4E5} Download Entry Logs"),o(),i(5,"button",5),h("click",function(){p(e);let a=m();return f(a.onClose())}),d(6,"\u2715"),o()(),i(7,"div",6)(8,"div",7)(9,"h3",8),d(10,"Select Date Range"),o(),i(11,"div",9)(12,"label",10)(13,"input",11),h("change",function(){p(e);let a=m();return f(a.onDateRangeChange("current-month"))}),o(),i(14,"span",12),d(15,"Current Month"),o()(),i(16,"label",10)(17,"input",13),h("change",function(){p(e);let a=m();return f(a.onDateRangeChange("previous-month"))}),o(),i(18,"span",12),d(19,"Previous Month"),o()(),i(20,"label",10)(21,"input",14),h("change",function(){p(e);let a=m();return f(a.onDateRangeChange("single-month"))}),o(),i(22,"span",12),d(23,"Select Month"),o()(),i(24,"label",10)(25,"input",15),h("change",function(){p(e);let a=m();return f(a.onDateRangeChange("full-year"))}),o(),i(26,"span",12),d(27,"Full Year"),o()()(),b(28,pe,3,2,"div",16),o(),i(29,"div",7)(30,"h3",8),d(31,"Include Optional Columns"),o(),i(32,"p",17),d(33,"Entry Time, Exit Time, and Duration are always included."),o(),i(34,"div",18)(35,"label",19)(36,"input",20),h("change",function(a){p(e);let l=m();return f(l.includeCompanyName.set(a.target.checked))}),o(),i(37,"span",21),d(38,"Company Name"),o()(),i(39,"label",19)(40,"input",20),h("change",function(a){p(e);let l=m();return f(l.includeStatus.set(a.target.checked))}),o(),i(41,"span",21),d(42,"Status (WFH, Office, etc.)"),o()(),i(43,"label",19)(44,"input",20),h("change",function(a){p(e);let l=m();return f(l.includeComments.set(a.target.checked))}),o(),i(45,"span",21),d(46,"Comments"),o()()()(),i(47,"div",7)(48,"h3",8),d(49,"Days to Include"),o(),i(50,"div",9)(51,"label",10)(52,"input",22),h("change",function(){p(e);let a=m();return f(a.onDaysToIncludeChange("entries-only"))}),o(),i(53,"span",12),d(54,"Only days with entries"),o()(),i(55,"label",10)(56,"input",23),h("change",function(){p(e);let a=m();return f(a.onDaysToIncludeChange("include-weekends"))}),o(),i(57,"span",12),d(58,"Include weekends (Sat & Sun)"),o()(),i(59,"label",10)(60,"input",24),h("change",function(){p(e);let a=m();return f(a.onDaysToIncludeChange("all-days"))}),o(),i(61,"span",12),d(62,"All days (including no entry)"),o()()()()(),i(63,"div",25)(64,"button",26),h("click",function(){p(e);let a=m();return f(a.onClose())}),d(65,"Cancel"),o(),i(66,"button",27),h("click",function(){p(e);let a=m();return f(a.onDownload())}),i(67,"span",28),d(68,"\u{1F4C4}"),o(),d(69," Download PDF "),o()()()()}if(r&2){let e=m();c(13),x("checked",e.dateRangeType()==="current-month"),c(4),x("checked",e.dateRangeType()==="previous-month"),c(4),x("checked",e.dateRangeType()==="single-month"),c(4),x("checked",e.dateRangeType()==="full-year"),c(3),M(e.showYearSelector()||e.showMonthSelector()?28:-1),c(8),x("checked",e.includeCompanyName()),c(4),x("checked",e.includeStatus()),c(4),x("checked",e.includeComments()),c(8),x("checked",e.daysToInclude()==="entries-only"),c(4),x("checked",e.daysToInclude()==="include-weekends"),c(4),x("checked",e.daysToInclude()==="all-days")}}var H=class r{isOpen=Q(!1);closeDialog=B();download=B();dateRangeType=P("current-month");selectedYear=P(new Date().getFullYear());selectedMonth=P(new Date().getMonth()+1);includeCompanyName=P(!1);includeComments=P(!1);includeStatus=P(!1);daysToInclude=P("entries-only");availableYears=S(()=>{let t=new Date().getFullYear();return[t,t-1,t-2]});months=[{value:1,label:"January"},{value:2,label:"February"},{value:3,label:"March"},{value:4,label:"April"},{value:5,label:"May"},{value:6,label:"June"},{value:7,label:"July"},{value:8,label:"August"},{value:9,label:"September"},{value:10,label:"October"},{value:11,label:"November"},{value:12,label:"December"}];showMonthSelector=S(()=>this.dateRangeType()==="single-month");showYearSelector=S(()=>this.dateRangeType()==="full-year"||this.dateRangeType()==="single-month");onDateRangeChange(t){this.dateRangeType.set(t)}onYearChange(t){this.selectedYear.set(parseInt(t,10))}onMonthChange(t){this.selectedMonth.set(parseInt(t,10))}onDaysToIncludeChange(t){this.daysToInclude.set(t)}onClose(){this.closeDialog.emit()}onDownload(){let t={dateRangeType:this.dateRangeType(),selectedYear:this.selectedYear(),selectedMonth:this.selectedMonth(),includeCompanyName:this.includeCompanyName(),includeComments:this.includeComments(),includeStatus:this.includeStatus(),daysToInclude:this.daysToInclude()};this.download.emit(t),this.closeDialog.emit()}onOverlayClick(t){t.target.classList.contains("dialog-overlay")&&this.onClose()}static \u0275fac=function(e){return new(e||r)};static \u0275cmp=L({type:r,selectors:[["app-download-dialog"]],inputs:{isOpen:[1,"isOpen"]},outputs:{closeDialog:"closeDialog",download:"download"},decls:1,vars:1,consts:[["tabindex","-1",1,"dialog-overlay"],["tabindex","-1",1,"dialog-overlay",3,"click","keyup.escape"],["role","dialog","aria-modal","true","aria-labelledby","dialog-title",1,"dialog-container"],[1,"dialog-header"],["id","dialog-title"],["aria-label","Close",1,"close-btn",3,"click"],[1,"dialog-body"],[1,"form-section"],[1,"section-title"],[1,"radio-group"],[1,"radio-option"],["type","radio","name","dateRange","value","current-month",3,"change","checked"],[1,"radio-label"],["type","radio","name","dateRange","value","previous-month",3,"change","checked"],["type","radio","name","dateRange","value","single-month",3,"change","checked"],["type","radio","name","dateRange","value","full-year",3,"change","checked"],[1,"select-row"],[1,"section-hint"],[1,"checkbox-group"],[1,"checkbox-option"],["type","checkbox",3,"change","checked"],[1,"checkbox-label"],["type","radio","name","daysToInclude","value","entries-only",3,"change","checked"],["type","radio","name","daysToInclude","value","include-weekends",3,"change","checked"],["type","radio","name","daysToInclude","value","all-days",3,"change","checked"],[1,"dialog-footer"],[1,"btn","btn-secondary",3,"click"],[1,"btn","btn-primary",3,"click"],[1,"btn-icon"],[1,"select-group"],["for","year-select"],["id","year-select",3,"change","value"],[3,"value"],["for","month-select"],["id","month-select",3,"change","value"]],template:function(e,n){e&1&&b(0,fe,70,11,"div",0),e&2&&M(n.isOpen()?0:-1)},dependencies:[oe,ne,ae],styles:[".dialog-overlay[_ngcontent-%COMP%]{position:fixed;inset:0;background:#00000080;display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:_ngcontent-%COMP%_fadeIn .2s ease}@keyframes _ngcontent-%COMP%_fadeIn{0%{opacity:0}to{opacity:1}}.dialog-container[_ngcontent-%COMP%]{background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px #0003;animation:_ngcontent-%COMP%_slideUp .3s ease}@keyframes _ngcontent-%COMP%_slideUp{0%{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.dialog-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid #eee;background:linear-gradient(135deg,#667eea,#764ba2)}.dialog-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:0;font-size:1.25rem;color:#fff;display:flex;align-items:center;gap:.5rem}.close-btn[_ngcontent-%COMP%]{background:#fff3;border:none;width:32px;height:32px;border-radius:8px;font-size:1rem;color:#fff;cursor:pointer;transition:all .2s ease}.close-btn[_ngcontent-%COMP%]:hover{background:#ffffff4d}.dialog-body[_ngcontent-%COMP%]{padding:1.5rem;overflow-y:auto;flex:1}.form-section[_ngcontent-%COMP%]{margin-bottom:1.5rem}.form-section[_ngcontent-%COMP%]:last-child{margin-bottom:0}.section-title[_ngcontent-%COMP%]{margin:0 0 .75rem;font-size:.95rem;font-weight:600;color:#2c3e50}.section-hint[_ngcontent-%COMP%]{margin:-.5rem 0 .75rem;font-size:.8rem;color:#7f8c8d}.radio-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.radio-option[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:#f8f9fa;border-radius:10px;cursor:pointer;transition:all .2s ease;border:2px solid transparent}.radio-option[_ngcontent-%COMP%]:hover{background:#f0f0f0}.radio-option[_ngcontent-%COMP%]:has(input:checked){background:#e8f0fe;border-color:#667eea}.radio-option[_ngcontent-%COMP%]   input[type=radio][_ngcontent-%COMP%]{width:18px;height:18px;accent-color:#667eea;cursor:pointer}.radio-label[_ngcontent-%COMP%]{font-size:.9rem;color:#2c3e50;font-weight:500}.select-row[_ngcontent-%COMP%]{display:flex;gap:1rem;margin-top:1rem}.select-group[_ngcontent-%COMP%]{flex:1}.select-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{display:block;font-size:.8rem;font-weight:600;color:#555;margin-bottom:.4rem}.select-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]{width:100%;padding:.75rem;border:1px solid #ddd;border-radius:8px;font-size:.9rem;background:#fff;cursor:pointer;transition:all .2s ease}.select-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px #667eea1a}.checkbox-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.checkbox-option[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;background:#f8f9fa;border-radius:8px;cursor:pointer;transition:all .2s ease}.checkbox-option[_ngcontent-%COMP%]:hover{background:#f0f0f0}.checkbox-option[_ngcontent-%COMP%]:has(input:checked){background:#e8f5e9}.checkbox-option[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%]{width:18px;height:18px;accent-color:#4caf50;cursor:pointer}.checkbox-label[_ngcontent-%COMP%]{font-size:.9rem;color:#2c3e50}.dialog-footer[_ngcontent-%COMP%]{display:flex;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem;border-top:1px solid #eee;background:#f8f9fa}.btn[_ngcontent-%COMP%]{padding:.75rem 1.25rem;border:none;border-radius:10px;font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:.5rem}.btn[_ngcontent-%COMP%]:hover{transform:translateY(-1px)}.btn-primary[_ngcontent-%COMP%]{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}.btn-primary[_ngcontent-%COMP%]:hover{box-shadow:0 4px 12px #667eea66}.btn-secondary[_ngcontent-%COMP%]{background:#fff;color:#555;border:1px solid #ddd}.btn-secondary[_ngcontent-%COMP%]:hover{background:#f5f5f5}.btn-icon[_ngcontent-%COMP%]{font-size:1rem}@media (max-width: 480px){.dialog-container[_ngcontent-%COMP%]{max-height:95vh}.dialog-header[_ngcontent-%COMP%]{padding:1rem}.dialog-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{font-size:1.1rem}.dialog-body[_ngcontent-%COMP%]{padding:1rem}.select-row[_ngcontent-%COMP%]{flex-direction:column;gap:.75rem}.dialog-footer[_ngcontent-%COMP%]{flex-direction:column}.dialog-footer[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{width:100%;justify-content:center}}"],changeDetection:0})};var he=(r,t)=>t.fullDate;function _e(r,t){r&1&&(i(0,"div",10),Z(1,"div",14),i(2,"p"),d(3,"Loading attendance data..."),o()())}function ye(r,t){if(r&1){let e=$();i(0,"div",11)(1,"p",15),d(2,"\u26A0\uFE0F"),o(),i(3,"p",16),d(4),o(),i(5,"button",17),h("click",function(){p(e);let a=m();return f(a.retryLoadData())}),d(6,"Retry"),o()()}if(r&2){let e=m();c(4),D(e.error())}}function Ce(r,t){r&1&&(i(0,"div",24)(1,"span",26),d(2,"\u{1F334}"),o()())}function xe(r,t){if(r&1&&(i(0,"span",29),d(1),o()),r&2){let e=m(3).$implicit,n=m(2);U(n.getStatusClass(e.entry.status)),c(),R(" ",n.getStatusLabel(e.entry.status)," ")}}function be(r,t){if(r&1&&(i(0,"div",25)(1,"span",27),d(2,"\u25CF"),o(),b(3,xe,2,3,"span",28),o()),r&2){let e=m(2).$implicit;c(3),M(e.entry.status&&e.entry.status!=="Office"?3:-1)}}function Me(r,t){if(r&1&&b(0,Ce,3,0,"div",24)(1,be,4,1,"div",25),r&2){let e=m().$implicit;M(e.entry.status==="Day Off"?0:1)}}function ve(r,t){if(r&1){let e=$();i(0,"div",22),h("click",function(){let a=p(e).$implicit,l=m(2);return f(l.selectDay(a))})("keyup.enter",function(){let a=p(e).$implicit,l=m(2);return f(l.selectDay(a))}),i(1,"span",23),d(2),o(),b(3,Me,2,1),o()}if(r&2){let e,n=t.$implicit,a=m(2);q("other-month",!n.isCurrentMonth)("today",n.isToday)("has-entry",n.entry)("day-off",(n.entry==null?null:n.entry.status)==="Day Off")("future",n.isFuture)("selected",((e=a.selectedDay())==null?null:e.fullDate)===n.fullDate)("clickable",n.isCurrentMonth&&!n.isFuture),x("tabindex",n.isCurrentMonth&&!n.isFuture?0:-1),c(2),D(n.date),c(),M(n.entry&&n.isCurrentMonth?3:-1)}}function Oe(r,t){r&1&&(i(0,"div",21)(1,"p",30),d(2,"\u{1F4C5}"),o(),i(3,"p",31),d(4,"No attendance records found for this month."),o()())}function Pe(r,t){if(r&1&&(i(0,"div",18)(1,"div",19),d(2,"Sun"),o(),i(3,"div",19),d(4,"Mon"),o(),i(5,"div",19),d(6,"Tue"),o(),i(7,"div",19),d(8,"Wed"),o(),i(9,"div",19),d(10,"Thu"),o(),i(11,"div",19),d(12,"Fri"),o(),i(13,"div",19),d(14,"Sat"),o(),z(15,ve,4,17,"div",20,he),o(),b(17,Oe,5,0,"div",21)),r&2){let e=m();c(15),V(e.calendarDays()),c(2),M(e.calendarDays().length===0||e.totalDaysPresent()===0?17:-1)}}function De(r,t){if(r&1&&(i(0,"div",37)(1,"span",38),d(2,"\u{1F4CB} Status:"),o(),i(3,"span",39)(4,"span",43),d(5),o()()()),r&2){let e=m(2);c(4),U(e.getStatusClass(e.selectedDay().entry.status)),c(),R(" ",e.selectedDay().entry.status," ")}}function we(r,t){if(r&1&&(i(0,"span",44),d(1),o()),r&2){let e=m(3);c(),R("(",e.getExitDateDisplay(e.selectedDay().entry),")")}}function ke(r,t){if(r&1&&(i(0,"div",37)(1,"span",38),d(2,"\u23F1\uFE0F Duration:"),o(),i(3,"span",45),d(4),o()()),r&2){let e=m(3);c(4),D(e.selectedDay().entry.duration)}}function Se(r,t){if(r&1&&(i(0,"div",37)(1,"span",38),d(2,"\u{1F550} Entry Time:"),o(),i(3,"span",39),d(4),o()(),i(5,"div",37)(6,"span",38),d(7,"\u{1F550} Exit Time:"),o(),i(8,"span",39),d(9),b(10,we,2,1,"span",44),o()(),b(11,ke,5,1,"div",37)),r&2){let e=m(2);c(4),D(e.formatTime(e.selectedDay().entry.entryTime)),c(5),R(" ",e.formatTime(e.selectedDay().entry.exitTime)," "),c(),M(e.getExitDateDisplay(e.selectedDay().entry)?10:-1),c(),M(e.selectedDay().entry.duration?11:-1)}}function Ee(r,t){r&1&&(i(0,"div",40)(1,"p",46),d(2,"\u{1F334} Day Off - No work hours recorded"),o()())}function Te(r,t){if(r&1&&(i(0,"div",37)(1,"span",38),d(2,"\u{1F3E2} Company:"),o(),i(3,"span",39),d(4),o()()),r&2){let e=m(2);c(4),D(e.selectedDay().entry.companyName)}}function $e(r,t){if(r&1&&(i(0,"div",40)(1,"span",38),d(2,"\u{1F4AC} Comments:"),o(),i(3,"span",39),d(4),o()()),r&2){let e=m(2);c(4),D(e.selectedDay().entry.comments)}}function Ne(r,t){if(r&1){let e=$();i(0,"div",32),h("click",function(){p(e);let a=m();return f(a.closeDetails())})("keyup.escape",function(){p(e);let a=m();return f(a.closeDetails())}),i(1,"div",33),h("click",function(a){return p(e),f(a.stopPropagation())})("keyup",function(a){return p(e),f(a.stopPropagation())}),i(2,"div",34)(3,"h3"),d(4,"Attendance Details"),o(),i(5,"button",35),h("click",function(){p(e);let a=m();return f(a.closeDetails())}),d(6,"\u2715"),o()(),i(7,"div",36)(8,"div",37)(9,"span",38),d(10,"\u{1F4C5} Date:"),o(),i(11,"span",39),d(12),o()(),b(13,De,6,3,"div",37),b(14,Se,12,4)(15,Ee,3,0,"div",40),b(16,Te,5,1,"div",37),b(17,$e,5,1,"div",40),o(),i(18,"div",41)(19,"button",42),h("click",function(){p(e);let a=m();return f(a.closeDetails())}),d(20,"Close"),o()()()()}if(r&2){let e=m();c(12),D(e.selectedDay().fullDate),c(),M(e.selectedDay().entry.status?13:-1),c(),M(e.selectedDay().entry.status!=="Day Off"?14:15),c(2),M(e.selectedDay().entry.companyName?16:-1),c(),M(e.selectedDay().entry.comments?17:-1)}}var re=class r{attendanceState=I(ee);pdfExportService=I(W);currentYear=P(new Date().getFullYear());currentMonth=P(new Date().getMonth()+1);selectedDay=P(null);showDownloadDialog=P(!1);entries=S(()=>this.attendanceState.allEntries());isLoading=S(()=>this.attendanceState.isLoading());error=P("");monthName=S(()=>new Date(this.currentYear(),this.currentMonth()-1).toLocaleDateString("en-US",{month:"long",year:"numeric"}));calendarDays=S(()=>this.generateCalendarDays());entriesMap=S(()=>{let t=this.entries(),e=this.filterEntriesByMonth(t,this.currentYear(),this.currentMonth());return this.groupByDateLatestOnly(e)});totalDaysPresent=S(()=>this.entriesMap().size);totalWorkingHours=S(()=>{let t=0;this.entriesMap().forEach(a=>{if(a.duration){let l=a.duration.match(/(\d+)h\s*(\d+)m/);l&&(t+=parseInt(l[1])*60+parseInt(l[2]))}});let e=Math.floor(t/60),n=t%60;return`${e}h ${n}m`});ngOnInit(){this.attendanceState.refreshIfNeeded(5)}previousMonth(){let t=this.currentYear(),e=this.currentMonth()-1;e<1&&(e=12,t--),this.currentYear.set(t),this.currentMonth.set(e),this.selectedDay.set(null)}nextMonth(){let t=new Date,e=this.currentYear()*100+this.currentMonth(),n=t.getFullYear()*100+(t.getMonth()+1);if(e>=n)return;let a=this.currentYear(),l=this.currentMonth()+1;l>12&&(l=1,a++),this.currentYear.set(a),this.currentMonth.set(l),this.selectedDay.set(null)}canGoNext(){let t=new Date,e=this.currentYear()*100+this.currentMonth(),n=t.getFullYear()*100+(t.getMonth()+1);return e<n}selectDay(t){!t.isCurrentMonth||t.isFuture||this.selectedDay.set(t)}closeDetails(){this.selectedDay.set(null)}openDownloadDialog(){this.showDownloadDialog.set(!0)}closeDownloadDialog(){this.showDownloadDialog.set(!1)}downloadPdf(t){let e=this.entries();this.pdfExportService.generatePdf(e,t)}retryLoadData(){this.error.set(""),this.attendanceState.fetchAttendanceData()}filterEntriesByMonth(t,e,n){let a=`${e}-${String(n).padStart(2,"0")}`;return t.filter(l=>l.date.startsWith(a))}groupByDateLatestOnly(t){let e=new Map;return t.forEach(n=>{if(!n.date)return;let a=e.get(n.date);if(!a)e.set(n.date,n);else{let l=new Date(a.timestamp||a.entryTime).getTime();new Date(n.timestamp||n.entryTime).getTime()>l&&e.set(n.date,n)}}),e}generateCalendarDays(){let t=this.currentYear(),e=this.currentMonth(),n=this.entriesMap(),a=new Date(t,e-1,1),l=new Date(t,e,0),g=a.getDay(),s=l.getDate(),_=[],y=new Date,C=new Date(y.toLocaleString("en-US",{timeZone:"Asia/Kolkata"})),w=C.getFullYear(),v=String(C.getMonth()+1).padStart(2,"0"),u=String(C.getDate()).padStart(2,"0"),N=`${w}-${v}-${u}`,E=new Date(t,e-1,0).getDate();for(let O=g-1;O>=0;O--){let T=E-O,j=e-1<1?12:e-1,A=`${e-1<1?t-1:t}-${String(j).padStart(2,"0")}-${String(T).padStart(2,"0")}`;_.push({date:T,fullDate:A,isCurrentMonth:!1,isToday:!1,isFuture:!1})}for(let O=1;O<=s;O++){let T=`${t}-${String(e).padStart(2,"0")}-${String(O).padStart(2,"0")}`,j=n.get(T),G=new Date(t,e-1,O),A=new Date(C.getFullYear(),C.getMonth(),C.getDate()),le=G>A;_.push({date:O,fullDate:T,isCurrentMonth:!0,isToday:T===N,isFuture:le,entry:j})}let F=42-_.length,k=e+1>12?1:e+1,Y=e+1>12?t+1:t;for(let O=1;O<=F;O++){let T=`${Y}-${String(k).padStart(2,"0")}-${String(O).padStart(2,"0")}`;_.push({date:O,fullDate:T,isCurrentMonth:!1,isToday:!1,isFuture:!1})}return _}formatTime(t){if(!t)return"";try{return new Date(t).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:!0})}catch{return t}}getExitDateDisplay(t){if(!t.entryTime||!t.exitTime)return"";try{let e=new Date(t.entryTime),n=new Date(t.exitTime),a=`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`,l=`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;return a!==l?n.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"2-digit",year:"numeric"}):""}catch{return""}}getStatusClass(t){return{"Day Off":"status-day-off",WFH:"status-wfh",Office:"status-office","First Half Off":"status-half-off","Second Half Off":"status-half-off"}[t]||""}getStatusLabel(t){return{WFH:"WFH",Office:"OFF","First Half Off":"1/2","Second Half Off":"1/2","Day Off":"OFF"}[t]||""}static \u0275fac=function(e){return new(e||r)};static \u0275cmp=L({type:r,selectors:[["app-monthly-calendar"]],decls:26,vars:7,consts:[[1,"calendar-container"],[1,"calendar-header"],["aria-label","Previous month",1,"nav-btn",3,"click"],[1,"month-title"],["aria-label","Next month",1,"nav-btn",3,"click","disabled"],[1,"calendar-stats"],[1,"stat-item"],[1,"stat-label"],[1,"stat-value"],["aria-label","Download Entry Logs",1,"btn-download",3,"click"],[1,"loading-state"],[1,"error-state"],["tabindex","-1",1,"details-overlay"],[3,"closeDialog","download","isOpen"],[1,"spinner"],[1,"error-icon"],[1,"error-message"],[1,"btn","btn-retry",3,"click"],[1,"calendar-grid"],[1,"weekday-header"],["role","button",1,"calendar-day",3,"other-month","today","has-entry","day-off","future","selected","clickable","tabindex"],[1,"empty-state"],["role","button",1,"calendar-day",3,"click","keyup.enter","tabindex"],[1,"day-number"],[1,"entry-indicator","day-off-indicator"],[1,"entry-indicator"],[1,"status-icon"],[1,"present-dot"],[1,"status-mini-badge",3,"class"],[1,"status-mini-badge"],[1,"empty-icon"],[1,"empty-message"],["tabindex","-1",1,"details-overlay",3,"click","keyup.escape"],["role","dialog","aria-modal","true",1,"details-card",3,"click","keyup"],[1,"details-header"],["aria-label","Close",1,"close-btn",3,"click"],[1,"details-body"],[1,"detail-row"],[1,"detail-label"],[1,"detail-value"],[1,"detail-row","full-width"],[1,"details-footer"],[1,"btn","btn-close",3,"click"],[1,"status-badge"],[1,"exit-date-badge"],[1,"detail-value","highlight"],[1,"day-off-message"]],template:function(e,n){e&1&&(i(0,"div",0)(1,"div",1)(2,"button",2),h("click",function(){return n.previousMonth()}),d(3,"\u25C0"),o(),i(4,"h2",3),d(5),o(),i(6,"button",4),h("click",function(){return n.nextMonth()}),d(7,"\u25B6"),o()(),i(8,"div",5)(9,"div",6)(10,"span",7),d(11,"Days Present:"),o(),i(12,"span",8),d(13),o()(),i(14,"div",6)(15,"span",7),d(16,"Total Hours:"),o(),i(17,"span",8),d(18),o()(),i(19,"button",9),h("click",function(){return n.openDownloadDialog()}),d(20,"\u{1F4E5} Download"),o()(),b(21,_e,4,0,"div",10)(22,ye,7,1,"div",11)(23,Pe,18,1),b(24,Ne,21,5,"div",12),o(),i(25,"app-download-dialog",13),h("closeDialog",function(){return n.closeDownloadDialog()})("download",function(l){return n.downloadPdf(l)}),o()),e&2&&(c(5),D(n.monthName()),c(),x("disabled",!n.canGoNext()),c(7),D(n.totalDaysPresent()),c(5),D(n.totalWorkingHours()),c(3),M(n.isLoading()?21:n.error()?22:23),c(3),M(n.selectedDay()&&n.selectedDay().entry?24:-1),c(),x("isOpen",n.showDownloadDialog()))},dependencies:[X,H],styles:[".calendar-container[_ngcontent-%COMP%]{background:#fff;border-radius:12px;padding:1.5rem;box-shadow:0 4px 6px #0000001a;margin-top:2rem}.calendar-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;gap:1rem}.calendar-header[_ngcontent-%COMP%]   .month-title[_ngcontent-%COMP%]{margin:0;color:#2c3e50;font-size:1.4rem;text-align:center;flex:1}.calendar-header[_ngcontent-%COMP%]   .nav-btn[_ngcontent-%COMP%]{background:#3498db;color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:1.2rem;cursor:pointer;transition:all .3s ease;display:flex;align-items:center;justify-content:center}.calendar-header[_ngcontent-%COMP%]   .nav-btn[_ngcontent-%COMP%]:hover:not(:disabled){background:#2980b9;transform:scale(1.05)}.calendar-header[_ngcontent-%COMP%]   .nav-btn[_ngcontent-%COMP%]:active:not(:disabled){transform:scale(.95)}.calendar-header[_ngcontent-%COMP%]   .nav-btn[_ngcontent-%COMP%]:disabled{background:#bdc3c7;cursor:not-allowed;opacity:.5}.calendar-stats[_ngcontent-%COMP%]{display:flex;justify-content:space-around;gap:1rem;margin-bottom:1.5rem;padding:1rem;background:#f8f9fa;border-radius:8px}.calendar-stats[_ngcontent-%COMP%]   .stat-item[_ngcontent-%COMP%]{text-align:center;flex:1}.calendar-stats[_ngcontent-%COMP%]   .stat-item[_ngcontent-%COMP%]   .stat-label[_ngcontent-%COMP%]{display:block;font-size:.85rem;color:#7f8c8d;margin-bottom:.25rem}.calendar-stats[_ngcontent-%COMP%]   .stat-item[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%]{display:block;font-size:1.3rem;font-weight:700;color:#3498db}.btn-download[_ngcontent-%COMP%]{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;padding:.6rem 1rem;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s ease;display:flex;align-items:center;gap:.4rem;white-space:nowrap}.btn-download[_ngcontent-%COMP%]:hover{transform:translateY(-2px);box-shadow:0 4px 12px #667eea66}.btn-download[_ngcontent-%COMP%]:active{transform:translateY(0)}.calendar-grid[_ngcontent-%COMP%]{display:grid;grid-template-columns:repeat(7,1fr);gap:.5rem;margin-bottom:1rem;width:100%;overflow:hidden}.calendar-grid[_ngcontent-%COMP%]   .weekday-header[_ngcontent-%COMP%]{text-align:center;font-weight:700;color:#7f8c8d;padding:.5rem 0;font-size:.9rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;transition:all .2s ease;position:relative;background:#f8f9fa;min-height:50px;cursor:default}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{font-size:1rem;font-weight:600;color:#2c3e50}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]{position:absolute;bottom:4px;display:flex;align-items:center;gap:.25rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .present-dot[_ngcontent-%COMP%]{color:#27ae60;font-size:.8rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator.day-off-indicator[_ngcontent-%COMP%]   .status-icon[_ngcontent-%COMP%]{font-size:1rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .status-mini-badge[_ngcontent-%COMP%]{font-size:.5rem;padding:.1rem .25rem;border-radius:4px;font-weight:600;background:#e3f2fd;color:#1976d2}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .status-mini-badge.status-wfh[_ngcontent-%COMP%]{background:#e8f5e9;color:#2e7d32}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .status-mini-badge.status-day-off[_ngcontent-%COMP%]{background:#fff3cd;color:#856404}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .status-mini-badge.status-half-off[_ngcontent-%COMP%]{background:#fff9e6;color:#f57c00}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.other-month[_ngcontent-%COMP%]{background:transparent}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.other-month[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{color:#bdc3c7;font-size:.85rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.future[_ngcontent-%COMP%]{background:#fef5e7;cursor:not-allowed;border:1px dashed #f39c12}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.future[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{color:#d68910;font-weight:500}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.today[_ngcontent-%COMP%]{background:#e3f2fd;border:2px solid #3498db}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.today[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{color:#3498db;font-weight:700}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.clickable[_ngcontent-%COMP%]{cursor:pointer}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.has-entry[_ngcontent-%COMP%]{background:#d5f4e6}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.has-entry.clickable[_ngcontent-%COMP%]:hover{background:#b8e6d5;transform:scale(1.05)}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.has-entry.clickable[_ngcontent-%COMP%]:active{transform:scale(.98)}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.day-off[_ngcontent-%COMP%]{background:#fff3cd!important}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.day-off.clickable[_ngcontent-%COMP%]:hover{background:#ffe8a1!important}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.day-off[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{color:#856404;font-weight:700}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.selected[_ngcontent-%COMP%]{background:#3498db}.calendar-grid[_ngcontent-%COMP%]   .calendar-day.selected[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%], .calendar-grid[_ngcontent-%COMP%]   .calendar-day.selected[_ngcontent-%COMP%]   .present-dot[_ngcontent-%COMP%]{color:#fff}.loading-state[_ngcontent-%COMP%]{text-align:center;padding:3rem 1rem}.loading-state[_ngcontent-%COMP%]   .spinner[_ngcontent-%COMP%]{width:50px;height:50px;margin:0 auto 1rem;border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;animation:_ngcontent-%COMP%_spin 1s linear infinite}.loading-state[_ngcontent-%COMP%]   p[_ngcontent-%COMP%]{color:#7f8c8d;font-size:1rem}@keyframes _ngcontent-%COMP%_spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.error-state[_ngcontent-%COMP%]{text-align:center;padding:2rem 1rem}.error-state[_ngcontent-%COMP%]   .error-icon[_ngcontent-%COMP%]{font-size:3rem;margin-bottom:.5rem}.error-state[_ngcontent-%COMP%]   .error-message[_ngcontent-%COMP%]{color:#e74c3c;margin-bottom:1rem;font-size:1rem}.error-state[_ngcontent-%COMP%]   .btn-retry[_ngcontent-%COMP%]{background:#3498db;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:6px;cursor:pointer;font-weight:600;transition:all .3s ease}.error-state[_ngcontent-%COMP%]   .btn-retry[_ngcontent-%COMP%]:hover{background:#2980b9}.error-state[_ngcontent-%COMP%]   .btn-retry[_ngcontent-%COMP%]:active{transform:scale(.98)}.empty-state[_ngcontent-%COMP%]{text-align:center;padding:2rem 1rem}.empty-state[_ngcontent-%COMP%]   .empty-icon[_ngcontent-%COMP%]{font-size:3rem;margin-bottom:.5rem}.empty-state[_ngcontent-%COMP%]   .empty-message[_ngcontent-%COMP%]{color:#7f8c8d;font-size:1rem}.details-overlay[_ngcontent-%COMP%]{position:fixed;inset:0;background:#0009;display:flex;align-items:center;justify-content:center;z-index:1500;padding:1rem}.details-card[_ngcontent-%COMP%]{background:#fff;border-radius:16px;max-width:500px;width:100%;box-shadow:0 10px 40px #0000004d;max-height:90vh;overflow-y:auto;animation:_ngcontent-%COMP%_slideUp .3s ease}@keyframes _ngcontent-%COMP%_slideUp{0%{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.details-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;padding:1.5rem;border-bottom:1px solid #e9ecef}.details-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{margin:0;color:#2c3e50;font-size:1.3rem}.details-header[_ngcontent-%COMP%]   .close-btn[_ngcontent-%COMP%]{background:#f8f9fa;border:none;color:#7f8c8d;font-size:1.5rem;width:36px;height:36px;border-radius:50%;cursor:pointer;transition:all .3s ease}.details-header[_ngcontent-%COMP%]   .close-btn[_ngcontent-%COMP%]:hover{background:#e9ecef;color:#2c3e50}.details-header[_ngcontent-%COMP%]   .close-btn[_ngcontent-%COMP%]:active{transform:scale(.95)}.details-body[_ngcontent-%COMP%]{padding:1.5rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;padding:.75rem 0;border-bottom:1px solid #f8f9fa}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]:last-child{border-bottom:none}.details-body[_ngcontent-%COMP%]   .detail-row.full-width[_ngcontent-%COMP%]{flex-direction:column;align-items:flex-start;gap:.5rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-label[_ngcontent-%COMP%]{font-weight:600;color:#7f8c8d;font-size:.95rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]{color:#2c3e50;font-size:1rem;text-align:right}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value.highlight[_ngcontent-%COMP%]{color:#3498db;font-weight:700;font-size:1.1rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .exit-date-badge[_ngcontent-%COMP%]{display:inline-block;margin-left:.5rem;padding:.15rem .5rem;background:#fff3cd;color:#856404;border-radius:12px;font-size:.85rem;font-weight:600;border:1px solid #ffc107}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .status-badge[_ngcontent-%COMP%]{display:inline-block;padding:.25rem .75rem;border-radius:12px;font-size:.9rem;font-weight:600;background:#e3f2fd;color:#1976d2}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .status-badge.status-wfh[_ngcontent-%COMP%]{background:#e8f5e9;color:#2e7d32}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .status-badge.status-office[_ngcontent-%COMP%]{background:#e3f2fd;color:#1976d2}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .status-badge.status-day-off[_ngcontent-%COMP%]{background:#fff3cd;color:#856404;border:1px solid #ffc107}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .status-badge.status-half-off[_ngcontent-%COMP%]{background:#fff9e6;color:#f57c00;border:1px solid #ffb300}.day-off-message[_ngcontent-%COMP%]{text-align:center;padding:1rem;background:#fff3cd;border-radius:8px;color:#856404;font-weight:600;margin:0}.details-footer[_ngcontent-%COMP%]{padding:1rem 1.5rem;border-top:1px solid #e9ecef;display:flex;justify-content:flex-end}.details-footer[_ngcontent-%COMP%]   .btn-close[_ngcontent-%COMP%]{background:#3498db;color:#fff;border:none;padding:.75rem 1.5rem;border-radius:6px;cursor:pointer;font-weight:600;transition:all .3s ease}.details-footer[_ngcontent-%COMP%]   .btn-close[_ngcontent-%COMP%]:hover{background:#2980b9}.details-footer[_ngcontent-%COMP%]   .btn-close[_ngcontent-%COMP%]:active{transform:scale(.98)}.btn[_ngcontent-%COMP%]{touch-action:manipulation}@media (max-width: 600px){.calendar-container[_ngcontent-%COMP%]{padding:1rem;border-radius:12px;box-shadow:0 2px 12px #00000014;width:100%;max-width:100%;box-sizing:border-box}.calendar-header[_ngcontent-%COMP%]{margin-bottom:1rem}.calendar-header[_ngcontent-%COMP%]   .month-title[_ngcontent-%COMP%]{font-size:1.15rem}.calendar-header[_ngcontent-%COMP%]   .nav-btn[_ngcontent-%COMP%]{width:44px;height:44px;font-size:1.1rem}.calendar-stats[_ngcontent-%COMP%]{flex-direction:row;flex-wrap:wrap;padding:.75rem .5rem;gap:.5rem}.calendar-stats[_ngcontent-%COMP%]   .stat-item[_ngcontent-%COMP%]   .stat-label[_ngcontent-%COMP%]{font-size:.8rem}.calendar-stats[_ngcontent-%COMP%]   .stat-item[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%]{font-size:1.1rem}.btn-download[_ngcontent-%COMP%]{width:100%;justify-content:center;margin-top:.5rem}.calendar-grid[_ngcontent-%COMP%]{gap:.25rem;width:100%;max-width:100%;box-sizing:border-box}.calendar-grid[_ngcontent-%COMP%]   .weekday-header[_ngcontent-%COMP%]{font-size:.7rem;padding:.3rem 0}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]{min-height:42px;padding:.2rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .day-number[_ngcontent-%COMP%]{font-size:.85rem}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]{bottom:1px}.calendar-grid[_ngcontent-%COMP%]   .calendar-day[_ngcontent-%COMP%]   .entry-indicator[_ngcontent-%COMP%]   .present-dot[_ngcontent-%COMP%]{font-size:.6rem}.details-overlay[_ngcontent-%COMP%]{padding:0;align-items:flex-end}.details-card[_ngcontent-%COMP%]{max-width:100vw;width:100%;border-radius:16px 16px 0 0;max-height:85vh}.details-header[_ngcontent-%COMP%]{padding:1rem}.details-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%]{font-size:1.15rem}.details-header[_ngcontent-%COMP%]   .close-btn[_ngcontent-%COMP%]{width:40px;height:40px;min-width:44px;min-height:44px}.details-body[_ngcontent-%COMP%]{padding:1rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]{padding:.6rem 0;flex-wrap:wrap}.details-body[_ngcontent-%COMP%]   .detail-row.full-width[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]{text-align:left}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-label[_ngcontent-%COMP%]{font-size:.9rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]{font-size:.95rem;word-break:break-word;max-width:60%}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value.highlight[_ngcontent-%COMP%]{font-size:1.05rem}.details-body[_ngcontent-%COMP%]   .detail-row[_ngcontent-%COMP%]   .detail-value[_ngcontent-%COMP%]   .exit-date-badge[_ngcontent-%COMP%]{display:inline-block;margin-left:.25rem;margin-top:.25rem;padding:.15rem .4rem;font-size:.75rem}.details-footer[_ngcontent-%COMP%]{padding:1rem}.details-footer[_ngcontent-%COMP%]   .btn-close[_ngcontent-%COMP%]{width:100%;padding:1rem;min-height:50px;font-size:1.1rem;border-radius:10px}}"],changeDetection:0})};export{re as MonthlyCalendarComponent};
