(self.webpackChunkcarlton_dev=self.webpackChunkcarlton_dev||[]).push([[678],{9634:function(e){!function(){"use strict";e.exports={polyfill:function(){var e=window,t=document;if(!("scrollBehavior"in t.documentElement.style)||!0===e.__forceSmoothScrollPolyfill__){var o,i=e.HTMLElement||e.Element,n={scroll:e.scroll||e.scrollTo,scrollBy:e.scrollBy,elementScroll:i.prototype.scroll||a,scrollIntoView:i.prototype.scrollIntoView},l=e.performance&&e.performance.now?e.performance.now.bind(e.performance):Date.now,r=(o=e.navigator.userAgent,new RegExp(["MSIE ","Trident/","Edge/"].join("|")).test(o)?1:0);e.scroll=e.scrollTo=function(){void 0!==arguments[0]&&(!0!==c(arguments[0])?h.call(e,t.body,void 0!==arguments[0].left?~~arguments[0].left:e.scrollX||e.pageXOffset,void 0!==arguments[0].top?~~arguments[0].top:e.scrollY||e.pageYOffset):n.scroll.call(e,void 0!==arguments[0].left?arguments[0].left:"object"!=typeof arguments[0]?arguments[0]:e.scrollX||e.pageXOffset,void 0!==arguments[0].top?arguments[0].top:void 0!==arguments[1]?arguments[1]:e.scrollY||e.pageYOffset))},e.scrollBy=function(){void 0!==arguments[0]&&(c(arguments[0])?n.scrollBy.call(e,void 0!==arguments[0].left?arguments[0].left:"object"!=typeof arguments[0]?arguments[0]:0,void 0!==arguments[0].top?arguments[0].top:void 0!==arguments[1]?arguments[1]:0):h.call(e,t.body,~~arguments[0].left+(e.scrollX||e.pageXOffset),~~arguments[0].top+(e.scrollY||e.pageYOffset)))},i.prototype.scroll=i.prototype.scrollTo=function(){if(void 0!==arguments[0])if(!0!==c(arguments[0])){var e=arguments[0].left,t=arguments[0].top;h.call(this,this,void 0===e?this.scrollLeft:~~e,void 0===t?this.scrollTop:~~t)}else{if("number"==typeof arguments[0]&&void 0===arguments[1])throw new SyntaxError("Value could not be converted");n.elementScroll.call(this,void 0!==arguments[0].left?~~arguments[0].left:"object"!=typeof arguments[0]?~~arguments[0]:this.scrollLeft,void 0!==arguments[0].top?~~arguments[0].top:void 0!==arguments[1]?~~arguments[1]:this.scrollTop)}},i.prototype.scrollBy=function(){void 0!==arguments[0]&&(!0!==c(arguments[0])?this.scroll({left:~~arguments[0].left+this.scrollLeft,top:~~arguments[0].top+this.scrollTop,behavior:arguments[0].behavior}):n.elementScroll.call(this,void 0!==arguments[0].left?~~arguments[0].left+this.scrollLeft:~~arguments[0]+this.scrollLeft,void 0!==arguments[0].top?~~arguments[0].top+this.scrollTop:~~arguments[1]+this.scrollTop))},i.prototype.scrollIntoView=function(){if(!0!==c(arguments[0])){var o=m(this),i=o.getBoundingClientRect(),l=this.getBoundingClientRect();o!==t.body?(h.call(this,o,o.scrollLeft+l.left-i.left,o.scrollTop+l.top-i.top),"fixed"!==e.getComputedStyle(o).position&&e.scrollBy({left:i.left,top:i.top,behavior:"smooth"})):e.scrollBy({left:l.left,top:l.top,behavior:"smooth"})}else n.scrollIntoView.call(this,void 0===arguments[0]||arguments[0])}}function a(e,t){this.scrollLeft=e,this.scrollTop=t}function c(e){if(null===e||"object"!=typeof e||void 0===e.behavior||"auto"===e.behavior||"instant"===e.behavior)return!0;if("object"==typeof e&&"smooth"===e.behavior)return!1;throw new TypeError("behavior member of ScrollOptions "+e.behavior+" is not a valid value for enumeration ScrollBehavior.")}function s(e,t){return"Y"===t?e.clientHeight+r<e.scrollHeight:"X"===t?e.clientWidth+r<e.scrollWidth:void 0}function p(t,o){var i=e.getComputedStyle(t,null)["overflow"+o];return"auto"===i||"scroll"===i}function d(e){var t=s(e,"Y")&&p(e,"Y"),o=s(e,"X")&&p(e,"X");return t||o}function m(e){for(;e!==t.body&&!1===d(e);)e=e.parentNode||e.host;return e}function f(t){var o,i,n,r,a=(l()-t.startTime)/468;r=a=a>1?1:a,o=.5*(1-Math.cos(Math.PI*r)),i=t.startX+(t.x-t.startX)*o,n=t.startY+(t.y-t.startY)*o,t.method.call(t.scrollable,i,n),i===t.x&&n===t.y||e.requestAnimationFrame(f.bind(e,t))}function h(o,i,r){var c,s,p,d,m=l();o===t.body?(c=e,s=e.scrollX||e.pageXOffset,p=e.scrollY||e.pageYOffset,d=n.scroll):(c=o,s=o.scrollLeft,p=o.scrollTop,d=a),f({scrollable:c,method:d,startTime:m,startX:s,startY:p,x:i,y:r})}}}}()},6413:function(e,t,o){"use strict";o.r(t),o.d(t,{default:function(){return P}});var i=o(7294),n=o(9692),l=o(7688),r=o(7882),a=o(5444),c=o(4218),s=o(220),p=o(7904),d=o(9425),m=o(9634),f=o.n(m),h=o(5501);f().polyfill();var y=(0,n.default)(r.E.div).withConfig({displayName:"contactForm__Wrapper",componentId:"sc-1vquy1i-0"})(["padding:8px;min-height:300px;min-width:250px;"]),u=(0,n.default)(r.E.form).withConfig({displayName:"contactForm__Form",componentId:"sc-1vquy1i-1"})(["max-width:834px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;padding:20px;"]),x=(0,n.default)(r.E.input).withConfig({displayName:"contactForm__EmailInput",componentId:"sc-1vquy1i-2"})([""," min-width:250px;border-radius:10px;font-size:0.75rem;height:2rem;padding:16px 18px;border:none;margin:8px;&::placeholder{color:",";}"],l.$_,(function(e){return e.theme.colors.inactive})),g=(0,n.default)(r.E.textarea).withConfig({displayName:"contactForm__MessageInput",componentId:"sc-1vquy1i-3"})([""," min-width:250px;width:100%;border-radius:10px;font-size:0.75rem;height:7.25rem;padding:16px 18px;border:none;margin:8px;&::placeholder{color:",";}@media (min-width:843px){min-width:350px;}"],l.$_,(function(e){return e.theme.colors.inactive})),v=(0,n.default)(r.E.div).withConfig({displayName:"contactForm__Success",componentId:"sc-1vquy1i-4"})([""," border-radius:10px;margin:16px 18px;padding:9px 15px;font-weight:bold;cursor:default;"],l.$_),w=(0,n.default)(r.E.div).withConfig({displayName:"contactForm__Text",componentId:"sc-1vquy1i-5"})([""," margin:8px 20px;"],l.$_),b=(0,n.default)(r.E.div).withConfig({displayName:"contactForm__ButtonWrapper",componentId:"sc-1vquy1i-6"})(["display:flex;justify-content:center;align-self:flex-start;align-items:flex-start;height:100%;min-height:300px;@media (min-height:800px){align-items:flex-end;align-self:flex-end;}"]),E=function(){var e=(0,i.useState)(!1),t=(0,p.Z)(e,2),o=t[0],n=t[1],l=(0,i.useState)(!1),r=(0,p.Z)(l,2),a=r[0],c=r[1];return i.createElement(y,{id:"contactform",initial:{opacity:0},animate:{opacity:1},transition:{delay:.25},exit:{opacity:0}},i.createElement(d.M,{exitBeforeEnter:!0},!o&&i.createElement(b,{initial:{opacity:0,y:100},animate:{opacity:1,y:0},transition:{delay:.25},exit:{opacity:0,y:100}},i.createElement(s.Z,{key:"contact",color:"textPrimary",borderColor:"tertiary",onClick:function(){n(!0),"undefined"!=typeof window&&window.scrollTo({top:document.body.scrollHeight,left:0,behavior:"smooth"})}},"Contact")),o&&!a&&i.createElement(u,{target:"frame",key:"form",action:"https://formsubmit.co/".concat(h.email),method:"POST",initial:{opacity:0,y:100},animate:{opacity:1,y:0},transition:{delay:.25},exit:{opacity:0,y:100}},i.createElement(w,{color:"textPrimary"},"Get in touch"),i.createElement(x,{color:"textPrimary",backgroundColor:"paper",type:"text",placeholder:"Email Address",name:"email",required:!0}),i.createElement(g,{color:"textPrimary",backgroundColor:"paper",type:"text",placeholder:"Your message",name:"textarea",required:!0}),i.createElement(s.Z,{color:"tertiary",variant:"small",type:"submit",onClick:function(){c(!0)}},"Submit")),o&&a&&i.createElement(v,{color:"info",backgroundColor:"paper",initial:{opacity:0,y:100},animate:{opacity:1,y:0},transition:{delay:.25},exit:{opacity:0,y:100}},"Sent!")),i.createElement("iframe",{style:{display:"none"},title:"frame",name:"frame"}))},_=(0,n.default)(r.E.div).withConfig({displayName:"pages__Page",componentId:"sc-1hc810v-0"})(["width:100%;min-height:100%;display:flex;flex-direction:column;justify-content:space-between;flex-grow:1;"]),C=(0,n.default)(r.E.section).withConfig({displayName:"pages__Hero",componentId:"sc-1hc810v-1"})([""," padding-top:80px;padding-bottom:32px;display:flex;flex-direction:column;justify-content:center;align-items:center;height:60%;min-height:460px;@media (min-width:834px){height:40vh;padding-top:100px;padding-bottom:0px;flex-direction:row;}"],l.$_),I=(0,n.default)(r.E.section).withConfig({displayName:"pages__Content",componentId:"sc-1hc810v-2"})(["display:flex;justify-content:center;align-items:flex-end;@media (min-width:834px){min-height:400px;}"]),T=(0,n.default)(r.E.div).withConfig({displayName:"pages__TitleContainer",componentId:"sc-1hc810v-3"})(["display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;padding:30px 30px 0px 30px;@media (min-width:834px){padding:30px 0px 0px 30px;}"]),S=(0,n.default)(r.E.h1).withConfig({displayName:"pages__Title",componentId:"sc-1hc810v-4"})([""," font-family:Biennale-Black,sans-serif;font-size:4rem;flex-grow:0;max-width:20.25rem;margin-bottom:16px;@media (min-width:834px){font-size:6rem;max-width:25rem;margin-bottom:0;}"],l.$_),N=(0,n.default)(r.E.h2).withConfig({displayName:"pages__Subtitle",componentId:"sc-1hc810v-5"})([""," font-size:1.125rem;"],l.$_),k=(0,n.default)(r.E.div).withConfig({displayName:"pages__IntroContainer",componentId:"sc-1hc810v-6"})(["display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:30px 15px 30px 30px max-width:20.25rem;@media (min-width:834px){max-width:25rem;}"]),j=(0,n.default)(r.E.p).withConfig({displayName:"pages__Intro",componentId:"sc-1hc810v-7"})([""," max-width:18rem;font-size:0.875rem;"],l.$_),Y=(0,n.default)(r.E.span).withConfig({displayName:"pages__Emphasis",componentId:"sc-1hc810v-8"})([""," font-weight:bold;"],l.$_),B=(0,n.default)(r.E.div).withConfig({displayName:"pages__Links",componentId:"sc-1hc810v-9"})(["display:flex;flex-direction:row;justify-content:flex-start;margin:20px 0;"]),X=(0,n.default)(r.E.div).withConfig({displayName:"pages__Social",componentId:"sc-1hc810v-10"})([""," display:flex;flex-direction:row;justify-content:flex-start;@media (min-width:834px){display:none;}"],l.$_),L=(0,n.default)(r.E.a).withConfig({displayName:"pages__Icon",componentId:"sc-1hc810v-11"})(["color:inherit;padding:10px;&:hover,&:focus{transform:translateY(-3px);color:",";}svg{color:inherit;width:32px;height:32px;path{fill:currentColor;}}"],(function(e){return e.theme.colors.textPrimary})),P=function(){return i.createElement(c.Z,null,i.createElement(_,{key:"indexpage",initial:{y:"-70vh"},animate:{y:0},transition:{type:"spring",stiffness:50},exit:{y:"-70vh"}},i.createElement(C,{backgroundColor:"paper"},i.createElement(T,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.3}},i.createElement(N,{color:"warning"},"Hello, my name is"),i.createElement(S,{color:"textPrimary"},"Carlton Lindsay.")),i.createElement(k,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.5}},i.createElement(j,{color:"textSecondary"},"/*"," ","I'm a self-taught",i.createElement(Y,{color:"error"}," web developer "),"with a background in hardware engineering and product design."," ","*/"),i.createElement(B,null,i.createElement(s.Z,{as:a.rU,to:"/projects",color:"warning",borderColor:"primary"},"View Projects"),i.createElement(s.Z,{color:"warning",borderColor:"secondary"},"View Résumé")),i.createElement(X,{color:"inactive"},h.socialLinks.map((function(e,t){var o=e.name,n=e.url,l=e.icon;return i.createElement(L,{href:n,"aria-label":o,target:"_blank",rel:"noreferrer",key:t,dangerouslySetInnerHTML:{__html:l}})}))))),i.createElement(I,null,i.createElement(E,null))))}}}]);