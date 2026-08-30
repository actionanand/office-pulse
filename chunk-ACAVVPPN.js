import{a as G}from"./chunk-TM3YUWMW.js";import{m as J,n as B,s as K}from"./chunk-PNCQUCO5.js";import{Bb as m,Ob as u,Pa as h,Pb as F,Se as j,U as z,Z as L,ab as H,ca as f,da as y,ea as E,fa as I,fc as R,ic as W,jc as U,ma as D,mb as S,nb as O,pb as A,qb as Y,rb as V,sb as x,tb as r,ub as l,vb as $,yb as N,zb as v}from"./chunk-GLMVOM2U.js";var q=class c{snackbarService=L(G);generatePdf(t,e){let{title:a,rows:n,monthSummaries:i}=this.prepareData(t,e),s=this.generateHtml(a,n,e,i),o=this.generateAndroidPayload(a,n,e,i);this.downloadPdf(s,this.generateFileName(e),o)}prepareData(t,e){let a=this.generateTitle(e),n=this.getDateRange(e),i=this.groupByDateLatestOnly(t),s=[],o=new Date(n.start),p=new Date(n.end);for(;o<=p;){let _=this.formatDateKey(o),C=o.getDay(),b=C===0||C===6,d=i.get(_),k=d?.status==="Day Off",M=b||k,P=!!d,w=!P&&!b,T=!1;switch(e.daysToInclude){case"entries-only":T=P;break;case"include-weekends":T=P||b;break;case"all-days":T=!0;break}T&&s.push({date:this.formatDisplayDate(o),dayName:this.getDayName(o),entryTime:M||w?"-":this.formatTime(d?.entryTime),exitTime:M||w?"-":this.formatTime(d?.exitTime),duration:M||w?"-":d?.duration||"-",companyName:d?.companyName||"-",comments:d?.comments||"-",status:b?"Weekend":w?"No Entry":d?.status||"-",isWeekOff:M,isNoEntry:w,month:o.getMonth()+1,year:o.getFullYear()}),o.setDate(o.getDate()+1)}let g=this.calculateMonthSummaries(s);return{title:a,rows:s,monthSummaries:g}}calculateMonthSummaries(t){let e=new Map;return t.forEach(a=>{if(!a.month||!a.year)return;let n=`${a.year}-${a.month}`;e.has(n)||e.set(n,{month:a.month,year:a.year,monthName:new Date(a.year,a.month-1).toLocaleString("en-US",{month:"long",year:"numeric"}),workingDays:0,totalMinutes:0});let i=e.get(n);if(!a.isWeekOff&&!a.isNoEntry&&(i.workingDays++,a.duration&&a.duration!=="-")){let s=a.duration.match(/(\d+)h\s*(\d+)m/);s&&(i.totalMinutes+=parseInt(s[1])*60+parseInt(s[2]))}}),Array.from(e.values()).sort((a,n)=>a.year!==n.year?a.year-n.year:a.month-n.month)}generateTitle(t){let e=t.selectedYear,a=new Date;switch(t.dateRangeType){case"full-year":return`InOut Logs for Year ${e}`;case"current-month":return`InOut Logs for ${a.toLocaleString("en-US",{month:"long"})} ${a.getFullYear()}`;case"previous-month":{let n=a.getMonth()-1,i=n<0?a.getFullYear()-1:a.getFullYear(),s=n<0?11:n;return`InOut Logs for ${new Date(i,s).toLocaleString("en-US",{month:"long"})} ${i}`}case"single-month":{let n=t.selectedMonth||new Date().getMonth()+1;return`InOut Logs for ${new Date(e,n-1).toLocaleString("en-US",{month:"long"})} ${e}`}default:return"InOut Logs"}}getDateRange(t){let e=t.selectedYear,a=new Date;switch(t.dateRangeType){case"full-year":return{start:new Date(e,0,1),end:new Date(e,11,31)};case"current-month":{let n=a.getMonth();return{start:new Date(a.getFullYear(),n,1),end:new Date(a.getFullYear(),n+1,0)}}case"previous-month":{let n=a.getMonth()-1,i=n<0?a.getFullYear()-1:a.getFullYear(),s=n<0?11:n;return{start:new Date(i,s,1),end:new Date(i,s+1,0)}}case"single-month":{let n=(t.selectedMonth||1)-1;return{start:new Date(e,n,1),end:new Date(e,n+1,0)}}default:return{start:new Date(e,0,1),end:new Date(e,11,31)}}}generateHtml(t,e,a,n){let i=this.getTableHeaders(a),s=a.dateRangeType==="full-year";return`
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

  ${this.generateOverallSummary(e,n)}

  ${s?this.generateMonthWiseTables(e,a,i,n):this.generateSingleTable(e,a,i)}

  ${s?this.generateYearlySummary(n,a.selectedYear):""}

  <div class="footer">
    <p>Office Pulse - Attendance Tracker</p>
  </div>
</body>
</html>`}generateOverallSummary(t,e){let a=t.filter(g=>!g.isWeekOff&&!g.isNoEntry).length,n=t.filter(g=>g.isWeekOff).length,i=t.filter(g=>g.isNoEntry).length,s=e.reduce((g,_)=>g+_.totalMinutes,0),o=Math.floor(s/60),p=s%60;return`
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${a}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${n}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      ${i>0?`
      <div class="summary-item">
        <div class="summary-value">${i}</div>
        <div class="summary-label">No Entry Days</div>
      </div>
      `:""}
      <div class="summary-item">
        <div class="summary-value">${o}h ${p}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`}generateSingleTable(t,e,a){return`
    <table>
      <thead>
        <tr>
          ${a.map(n=>`<th>${n}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${t.map(n=>this.generateTableRow(n,e)).join("")}
      </tbody>
    </table>`}generateMonthWiseTables(t,e,a,n){let i=new Map;t.forEach(o=>{if(!o.month||!o.year)return;let p=`${o.year}-${o.month}`;i.has(p)||i.set(p,[]),i.get(p).push(o)});let s="";return n.forEach(o=>{let p=`${o.year}-${o.month}`,g=i.get(p)||[];if(g.length===0)return;let _=Math.floor(o.totalMinutes/60),C=o.totalMinutes%60;s+=`
      <div class="month-section">
        <div class="month-header">
          <span class="month-title">${o.monthName}</span>
          <div class="month-stats">
            <span class="month-stat">
              <span>Days:</span>
              <span class="month-stat-value">${o.workingDays}</span>
            </span>
            <span class="month-stat">
              <span>Hours:</span>
              <span class="month-stat-value">${_}h ${C}m</span>
            </span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${a.map(b=>`<th>${b}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${g.map(b=>this.generateTableRow(b,e)).join("")}
          </tbody>
        </table>
      </div>`}),s}generateYearlySummary(t,e){let a=t.reduce((_,C)=>_+C.workingDays,0),n=t.reduce((_,C)=>_+C.totalMinutes,0),i=Math.floor(n/60),s=n%60,o=a>0?Math.round(n/a):0,p=Math.floor(o/60),g=o%60;return`
    <div class="yearly-summary">
      <h3>Yearly Summary - ${e}</h3>
      <div class="yearly-summary-grid">
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${a}</div>
          <div class="yearly-summary-label">Total Working Days</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${i}h ${s}m</div>
          <div class="yearly-summary-label">Total Hours Worked</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${p}h ${g}m</div>
          <div class="yearly-summary-label">Avg Hours/Day</div>
        </div>
        <div class="yearly-summary-item">
          <div class="yearly-summary-value">${t.length}</div>
          <div class="yearly-summary-label">Months with Entries</div>
        </div>
      </div>
    </div>`}generateSummary(t){let e=t.filter(o=>!o.isWeekOff&&!o.isNoEntry).length,a=t.filter(o=>o.isWeekOff).length,n=0;t.forEach(o=>{if(!o.isWeekOff&&o.duration&&o.duration!=="-"){let p=o.duration.match(/(\d+)h\s*(\d+)m/);p&&(n+=parseInt(p[1])*60+parseInt(p[2]))}});let i=Math.floor(n/60),s=n%60;return`
    <div class="summary">
      <div class="summary-item">
        <div class="summary-value">${e}</div>
        <div class="summary-label">Working Days</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${a}</div>
        <div class="summary-label">Week Offs</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${i}h ${s}m</div>
        <div class="summary-label">Total Hours</div>
      </div>
    </div>`}getTableHeaders(t){let e=["Date","Day","Entry Time","Exit Time","Duration"];return t.includeCompanyName&&e.push("Company"),t.includeStatus&&e.push("Status"),t.includeComments&&e.push("Comments"),e}generateTableRow(t,e){let a="";t.isWeekOff?a="week-off":t.isNoEntry&&(a="no-entry");let n=`
      <td class="date-col">${t.date}</td>
      <td class="day-col">${t.dayName}</td>
      <td class="time-col">${t.entryTime}</td>
      <td class="time-col">${t.exitTime}</td>
      <td class="duration-col">${t.duration}</td>
    `;return e.includeCompanyName&&(n+=`<td>${t.companyName}</td>`),e.includeStatus&&(n+=`<td class="status-col">${t.status}</td>`),e.includeComments&&(n+=`<td class="comments-col">${t.comments}</td>`),`<tr class="${a}">${n}</tr>`}generateAndroidPayload(t,e,a,n){let i=this.getTableHeaders(a),s=a.dateRangeType==="full-year",o=n.reduce((d,k)=>d+k.totalMinutes,0),p=Math.floor(o/60),g=o%60,_=e.filter(d=>d.isNoEntry).length,C=[{label:"Working Days",value:String(e.filter(d=>!d.isWeekOff&&!d.isNoEntry).length)},{label:"Week Offs",value:String(e.filter(d=>d.isWeekOff).length)},..._>0?[{label:"No Entry Days",value:String(_)}]:[],{label:"Total Hours",value:`${p}h ${g}m`}],b=s?n.map(d=>{let k=e.filter(w=>w.month===d.month&&w.year===d.year),M=Math.floor(d.totalMinutes/60),P=d.totalMinutes%60;return{title:d.monthName,stats:[{label:"Days",value:String(d.workingDays)},{label:"Hours",value:`${M}h ${P}m`}],rows:k.map(w=>this.toAndroidRow(w,a))}}).filter(d=>d.rows.length>0):[{title:"Entries",stats:[],rows:e.map(d=>this.toAndroidRow(d,a))}];return JSON.stringify({title:t,generatedOn:new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}),summary:C,headers:i,sections:b})}toAndroidRow(t,e){let a=[t.date,t.dayName,t.entryTime,t.exitTime,t.duration];return e.includeCompanyName&&a.push(t.companyName||"-"),e.includeStatus&&a.push(t.status||"-"),e.includeComments&&a.push(t.comments||"-"),{state:t.isWeekOff?"week-off":t.isNoEntry?"no-entry":"normal",cells:a}}generateFileName(t){let e=t.selectedYear;switch(t.dateRangeType){case"full-year":return`inout_logs_${e}`;case"current-month":case"previous-month":case"single-month":{let a=t.selectedMonth||new Date().getMonth()+1;return`inout_logs_${new Date(e,a-1).toLocaleString("en-US",{month:"short"})}_${e}`}default:return"inout_logs"}}downloadPdf(t,e,a){let n=window.Capacitor,i=n?.Plugins?.OfficePulseExport;if(n?.isNativePlatform?.()===!0&&n.getPlatform?.()==="android"){if(!i){this.snackbarService.error("PDF download is not available in this Android build");return}this.snackbarService.success("Preparing PDF export");let p=i.exportPdf({filename:`${e}.pdf`,content:a,html:t,title:"Office Pulse PDF Export"}),g=0,_=new Promise((C,b)=>{g=window.setTimeout(()=>b(new Error("PDF export timed out")),2e4)});p.then(()=>window.clearTimeout(g),()=>window.clearTimeout(g)),Promise.race([p,_]).then(()=>this.snackbarService.success("Choose an app to save or share the PDF")).catch(()=>this.snackbarService.error("Unable to download PDF"));return}let o=window.open("","_blank");if(!o){this.snackbarService.error("Please allow popups to download PDF");return}o.document.write(t),o.document.close(),o.onload=()=>{setTimeout(()=>{o.print()},250)}}formatDateKey(t){let e=t.getFullYear(),a=String(t.getMonth()+1).padStart(2,"0"),n=String(t.getDate()).padStart(2,"0");return`${e}-${a}-${n}`}formatDisplayDate(t){return t.toLocaleDateString("en-US",{month:"short",day:"numeric"})}getDayName(t){return t.toLocaleDateString("en-US",{weekday:"short"})}formatTime(t){if(!t)return"-";try{let e=new Date(t);return isNaN(e.getTime())?"-":e.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:!0})}catch{return"-"}}groupByDateLatestOnly(t){let e=new Map;return t.forEach(a=>{if(!a.date)return;let n=e.get(a.date);if(!n)e.set(a.date,a);else{let i=new Date(n.timestamp||n.entryTime).getTime();new Date(a.timestamp||a.entryTime).getTime()>i&&e.set(a.date,a)}}),e}static \u0275fac=function(e){return new(e||c)};static \u0275prov=z({token:c,factory:c.\u0275fac,providedIn:"root"})};var Z=(c,t)=>t.value;function ee(c,t){if(c&1&&(r(0,"option",34),u(1),l()),c&2){let e=t.$implicit;x("value",e),h(),F(e)}}function te(c,t){if(c&1){let e=N();r(0,"div",31)(1,"label",32),u(2,"Year"),l(),r(3,"select",33),v("change",function(n){f(e);let i=m(3);return y(i.onYearChange(n.target.value))}),Y(4,ee,2,2,"option",34,A),l()()}if(c&2){let e=m(3);h(3),x("value",e.selectedYear()),h(),V(e.availableYears())}}function ne(c,t){if(c&1&&(r(0,"option",34),u(1),l()),c&2){let e=t.$implicit;x("value",e.value),h(),F(e.label)}}function ae(c,t){if(c&1){let e=N();r(0,"div",31)(1,"label",35),u(2,"Month"),l(),r(3,"select",36),v("change",function(n){f(e);let i=m(3);return y(i.onMonthChange(n.target.value))}),Y(4,ne,2,2,"option",34,Z),l()()}if(c&2){let e=m(3);h(3),x("value",e.selectedMonth()),h(),V(e.months)}}function oe(c,t){if(c&1&&(r(0,"div",18),S(1,te,6,1,"div",31),S(2,ae,6,1,"div",31),l()),c&2){let e=m(2);h(),O(e.showYearSelector()?1:-1),h(),O(e.showMonthSelector()?2:-1)}}function ie(c,t){if(c&1){let e=N();r(0,"div",1),v("click",function(n){f(e);let i=m();return y(i.onOverlayClick(n))})("keyup.escape",function(){f(e);let n=m();return y(n.onClose())}),r(1,"div",2)(2,"div",3)(3,"h2",4),E(),$(4,"svg",5),u(5," Download Entry Logs"),l(),I(),r(6,"button",6),v("click",function(){f(e);let n=m();return y(n.onClose())}),E(),$(7,"svg",7),l()(),I(),r(8,"div",8)(9,"div",9)(10,"h3",10),u(11,"Select Date Range"),l(),r(12,"div",11)(13,"label",12)(14,"input",13),v("change",function(){f(e);let n=m();return y(n.onDateRangeChange("current-month"))}),l(),r(15,"span",14),u(16,"Current Month"),l()(),r(17,"label",12)(18,"input",15),v("change",function(){f(e);let n=m();return y(n.onDateRangeChange("previous-month"))}),l(),r(19,"span",14),u(20,"Previous Month"),l()(),r(21,"label",12)(22,"input",16),v("change",function(){f(e);let n=m();return y(n.onDateRangeChange("single-month"))}),l(),r(23,"span",14),u(24,"Select Month"),l()(),r(25,"label",12)(26,"input",17),v("change",function(){f(e);let n=m();return y(n.onDateRangeChange("full-year"))}),l(),r(27,"span",14),u(28,"Full Year"),l()()(),S(29,oe,3,2,"div",18),l(),r(30,"div",9)(31,"h3",10),u(32,"Include Optional Columns"),l(),r(33,"p",19),u(34,"Entry Time, Exit Time, and Duration are always included."),l(),r(35,"div",20)(36,"label",21)(37,"input",22),v("change",function(n){f(e);let i=m();return y(i.includeCompanyName.set(n.target.checked))}),l(),r(38,"span",23),u(39,"Company Name"),l()(),r(40,"label",21)(41,"input",22),v("change",function(n){f(e);let i=m();return y(i.includeStatus.set(n.target.checked))}),l(),r(42,"span",23),u(43,"Status (WFH, Office, etc.)"),l()(),r(44,"label",21)(45,"input",22),v("change",function(n){f(e);let i=m();return y(i.includeComments.set(n.target.checked))}),l(),r(46,"span",23),u(47,"Comments"),l()()()(),r(48,"div",9)(49,"h3",10),u(50,"Days to Include"),l(),r(51,"div",11)(52,"label",12)(53,"input",24),v("change",function(){f(e);let n=m();return y(n.onDaysToIncludeChange("entries-only"))}),l(),r(54,"span",14),u(55,"Only days with entries"),l()(),r(56,"label",12)(57,"input",25),v("change",function(){f(e);let n=m();return y(n.onDaysToIncludeChange("include-weekends"))}),l(),r(58,"span",14),u(59,"Include weekends (Sat & Sun)"),l()(),r(60,"label",12)(61,"input",26),v("change",function(){f(e);let n=m();return y(n.onDaysToIncludeChange("all-days"))}),l(),r(62,"span",14),u(63,"All days (including no entry)"),l()()()()(),r(64,"div",27)(65,"button",28),v("click",function(){f(e);let n=m();return y(n.onClose())}),u(66,"Cancel"),l(),r(67,"button",29),v("click",function(){f(e);let n=m();return y(n.onDownload())}),E(),$(68,"svg",30),u(69," Download PDF "),l()()()()}if(c&2){let e=m();h(14),x("checked",e.dateRangeType()==="current-month"),h(4),x("checked",e.dateRangeType()==="previous-month"),h(4),x("checked",e.dateRangeType()==="single-month"),h(4),x("checked",e.dateRangeType()==="full-year"),h(3),O(e.showYearSelector()||e.showMonthSelector()?29:-1),h(8),x("checked",e.includeCompanyName()),h(4),x("checked",e.includeStatus()),h(4),x("checked",e.includeComments()),h(8),x("checked",e.daysToInclude()==="entries-only"),h(4),x("checked",e.daysToInclude()==="include-weekends"),h(4),x("checked",e.daysToInclude()==="all-days")}}var Q=class c{isOpen=U(!1);closeDialog=W();download=W();dateRangeType=D("current-month");selectedYear=D(new Date().getFullYear());selectedMonth=D(new Date().getMonth()+1);includeCompanyName=D(!1);includeComments=D(!1);includeStatus=D(!1);daysToInclude=D("entries-only");availableYears=R(()=>{let t=new Date().getFullYear();return[t,t-1,t-2]});months=[{value:1,label:"January"},{value:2,label:"February"},{value:3,label:"March"},{value:4,label:"April"},{value:5,label:"May"},{value:6,label:"June"},{value:7,label:"July"},{value:8,label:"August"},{value:9,label:"September"},{value:10,label:"October"},{value:11,label:"November"},{value:12,label:"December"}];showMonthSelector=R(()=>this.dateRangeType()==="single-month");showYearSelector=R(()=>this.dateRangeType()==="full-year"||this.dateRangeType()==="single-month");onDateRangeChange(t){this.dateRangeType.set(t)}onYearChange(t){this.selectedYear.set(parseInt(t,10))}onMonthChange(t){this.selectedMonth.set(parseInt(t,10))}onDaysToIncludeChange(t){this.daysToInclude.set(t)}onClose(){this.closeDialog.emit()}onDownload(){let t={dateRangeType:this.dateRangeType(),selectedYear:this.selectedYear(),selectedMonth:this.selectedMonth(),includeCompanyName:this.includeCompanyName(),includeComments:this.includeComments(),includeStatus:this.includeStatus(),daysToInclude:this.daysToInclude()};this.download.emit(t),this.closeDialog.emit()}onOverlayClick(t){t.target.classList.contains("dialog-overlay")&&this.onClose()}static \u0275fac=function(e){return new(e||c)};static \u0275cmp=H({type:c,selectors:[["app-download-dialog"]],inputs:{isOpen:[1,"isOpen"]},outputs:{closeDialog:"closeDialog",download:"download"},decls:1,vars:1,consts:[["tabindex","-1",1,"dialog-overlay"],["tabindex","-1",1,"dialog-overlay",3,"click","keyup.escape"],["role","dialog","aria-modal","true","aria-labelledby","dialog-title",1,"dialog-container"],[1,"dialog-header"],["id","dialog-title"],["lucideIcon","download","aria-hidden","true"],["aria-label","Close",1,"close-btn",3,"click"],["lucideIcon","x","aria-hidden","true"],[1,"dialog-body"],[1,"form-section"],[1,"section-title"],[1,"radio-group"],[1,"radio-option"],["type","radio","name","dateRange","value","current-month",3,"change","checked"],[1,"radio-label"],["type","radio","name","dateRange","value","previous-month",3,"change","checked"],["type","radio","name","dateRange","value","single-month",3,"change","checked"],["type","radio","name","dateRange","value","full-year",3,"change","checked"],[1,"select-row"],[1,"section-hint"],[1,"checkbox-group"],[1,"checkbox-option"],["type","checkbox",3,"change","checked"],[1,"checkbox-label"],["type","radio","name","daysToInclude","value","entries-only",3,"change","checked"],["type","radio","name","daysToInclude","value","include-weekends",3,"change","checked"],["type","radio","name","daysToInclude","value","all-days",3,"change","checked"],[1,"dialog-footer"],[1,"btn","btn-secondary",3,"click"],[1,"btn","btn-primary",3,"click"],["lucideIcon","file-down","aria-hidden","true",1,"btn-icon"],[1,"select-group"],["for","year-select"],["id","year-select",3,"change","value"],[3,"value"],["for","month-select"],["id","month-select",3,"change","value"]],template:function(e,a){e&1&&S(0,ie,70,11,"div",0),e&2&&O(a.isOpen()?0:-1)},dependencies:[K,J,B,j],styles:[".dialog-overlay[_ngcontent-%COMP%]{position:fixed;inset:0;background:#00000080;display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);animation:_ngcontent-%COMP%_fadeIn .2s ease}@keyframes _ngcontent-%COMP%_fadeIn{0%{opacity:0}to{opacity:1}}.dialog-container[_ngcontent-%COMP%]{background:#fff;border-radius:16px;width:100%;max-width:480px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px #0003;animation:_ngcontent-%COMP%_slideUp .3s ease}@keyframes _ngcontent-%COMP%_slideUp{0%{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.dialog-header[_ngcontent-%COMP%]{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid #eee;background:linear-gradient(135deg,#667eea,#764ba2)}.dialog-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{margin:0;font-size:1.25rem;color:#fff;display:flex;align-items:center;gap:.5rem}.close-btn[_ngcontent-%COMP%]{background:#fff3;border:none;width:32px;height:32px;border-radius:8px;font-size:1rem;color:#fff;cursor:pointer;transition:all .2s ease}.close-btn[_ngcontent-%COMP%]:hover{background:#ffffff4d}.dialog-body[_ngcontent-%COMP%]{padding:1.5rem;overflow-y:auto;flex:1}.form-section[_ngcontent-%COMP%]{margin-bottom:1.5rem}.form-section[_ngcontent-%COMP%]:last-child{margin-bottom:0}.section-title[_ngcontent-%COMP%]{margin:0 0 .75rem;font-size:.95rem;font-weight:600;color:#2c3e50}.section-hint[_ngcontent-%COMP%]{margin:-.5rem 0 .75rem;font-size:.8rem;color:#7f8c8d}.radio-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.radio-option[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:#f8f9fa;border-radius:10px;cursor:pointer;transition:all .2s ease;border:2px solid transparent}.radio-option[_ngcontent-%COMP%]:hover{background:#f0f0f0}.radio-option[_ngcontent-%COMP%]:has(input:checked){background:#e8f0fe;border-color:#667eea}.radio-option[_ngcontent-%COMP%]   input[type=radio][_ngcontent-%COMP%]{width:18px;height:18px;accent-color:#667eea;cursor:pointer}.radio-label[_ngcontent-%COMP%]{font-size:.9rem;color:#2c3e50;font-weight:500}.select-row[_ngcontent-%COMP%]{display:flex;gap:1rem;margin-top:1rem}.select-group[_ngcontent-%COMP%]{flex:1}.select-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%]{display:block;font-size:.8rem;font-weight:600;color:#555;margin-bottom:.4rem}.select-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]{width:100%;padding:.75rem;border:1px solid #ddd;border-radius:8px;font-size:.9rem;background:#fff;cursor:pointer;transition:all .2s ease}.select-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px #667eea1a}.checkbox-group[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:.5rem}.checkbox-option[_ngcontent-%COMP%]{display:flex;align-items:center;gap:.75rem;padding:.6rem 1rem;background:#f8f9fa;border-radius:8px;cursor:pointer;transition:all .2s ease}.checkbox-option[_ngcontent-%COMP%]:hover{background:#f0f0f0}.checkbox-option[_ngcontent-%COMP%]:has(input:checked){background:#e8f5e9}.checkbox-option[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%]{width:18px;height:18px;accent-color:#4caf50;cursor:pointer}.checkbox-label[_ngcontent-%COMP%]{font-size:.9rem;color:#2c3e50}.dialog-footer[_ngcontent-%COMP%]{display:flex;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem;border-top:1px solid #eee;background:#f8f9fa}.btn[_ngcontent-%COMP%]{padding:.75rem 1.25rem;border:none;border-radius:10px;font-weight:600;font-size:.9rem;cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:.5rem}.btn[_ngcontent-%COMP%]:hover{transform:translateY(-1px)}.btn-primary[_ngcontent-%COMP%]{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}.btn-primary[_ngcontent-%COMP%]:hover{box-shadow:0 4px 12px #667eea66}.btn-secondary[_ngcontent-%COMP%]{background:#fff;color:#555;border:1px solid #ddd}.btn-secondary[_ngcontent-%COMP%]:hover{background:#f5f5f5}.btn-icon[_ngcontent-%COMP%]{font-size:1rem}@media (max-width: 480px){.dialog-container[_ngcontent-%COMP%]{max-height:95vh}.dialog-header[_ngcontent-%COMP%]{padding:1rem}.dialog-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%]{font-size:1.1rem}.dialog-body[_ngcontent-%COMP%]{padding:1rem}.select-row[_ngcontent-%COMP%]{flex-direction:column;gap:.75rem}.dialog-footer[_ngcontent-%COMP%]{flex-direction:column}.dialog-footer[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%]{width:100%;justify-content:center}}"],changeDetection:0})};export{q as a,Q as b};
