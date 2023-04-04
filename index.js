import { app } from "https://cdn.skypack.dev/hyperapp";

export const getSubComponent = (elem, name) => elem.shadowRoot.querySelector(name);
export const getSubComponents = (elem, name) => Object.values(elem.shadowRoot.querySelector(name));

export const componentApp = (name, fn) => {
  
  customElements.define(name, class extends HTMLElement {
    #dispatch;
    
    constructor () {
      super() 
      this.attachShadow({mode: 'open'}).appendChild(document.createElement('div'))  
    }
    
    connectedCallback () { 
      const elem = this;
      const opts = fn(elem);
      
      // to each event in elem.events add an effect trigering that event 
      Object.keys(elem.events || {}).forEach(n => {
        elem.events[n].effect = (_, payload) => elem.dispatchEvent(new CustomEvent(n, payload))
      })
      
      // hook onStateChanged events
      if (elem.events?.stateChange) {
        const stateMiddleware = fn => dispatch => (action, payload) => {
          if (Array.isArray(action) && typeof action[0] !== 'function') {
            action = [fn(action[0]), ...action.slice(1)]
          } else if (!Array.isArray(action) && typeof action !== 'function') {
            action = fn(action)
          }
          dispatch(action, payload)
        }
        
        const stateChangeMw  = stateMiddleware(state => {
          if (state===undefined) return;
          const options = { detail: state===undefined ? undefined : (opts.externalState ? opts.externalState(state) : state) }
          elem.dispatchEvent(new CustomEvent(`stateChange`, options));
          return state;
        })
        
        const orgDispatch = opts.dispatch
        opts.dispatch = orgDispatch ? d => stateChangeMw(orgDispatch(d)) :  d => stateChangeMw(d);
      }
      
      // prevent view renders after disconnection
      if (opts.view) {
        const viewFn = opts.view;
        opts.view = s => s===undefined ? '' : viewFn(s)
      }
      
      // clone CSS
      if (!!opts.cloneCSS) {
        const cloneStyleSheets = element => {
          const sheets = [...(element.styleSheets || [])]
          const styleSheets = sheets.map(styleSheet => {
            try { 
              const rulesText = [...styleSheet.cssRules].map(rule => rule.cssText).join("")
              let res = new CSSStyleSheet()
              res.replaceSync(rulesText)
              return res
            } catch (e) {
            }
          }).filter(Boolean)
          if (element===document) return styleSheets
          if (!element.parentElement) return cloneStyleSheets(document).concat(styleSheets)
         return cloneStyleSheets(element.parentElement).concat(styleSheets)
       }
       
       elem.shadowRoot.adoptedStyleSheets = cloneStyleSheets(this)
      }
      
      // start app and save disaptch fn
      this.#dispatch = app({ init: opts.init, view: opts.view, subscriptions: opts.subscriptions, node: elem.shadowRoot.firstChild , dispatch: opts.dispatch }); 
      
      // map any entry in methods to an elem property dispatching an action
      if (opts.methods) { 
        const methodsProps = Object.fromEntries(
          Object.entries(opts.methods).map(
            ([name, action]) => [name, () => this.#dispatch(action)]
          )
        );
        Object.assign(elem, methodsProps);
      }
      
      // map any entry in props to a property where set dispatches an action 
      const props = {}
      Object.entries(opts.properties || {}).forEach(([name, action]) => {
        Object.defineProperty(elem, name, {
          get: () => { return props[name] },
          set: (x) => {
            props[name] = x
            this.#dispatch(action, x)
          }
        })
      })
    }
    
    disconnectedCallback () {
      this.#dispatch()
    }
    
  })
}
