import { app } from "https://cdn.skypack.dev/hyperapp"

export default (name, fn) => { 
  
  customElements.define(name, class extends HTMLElement {
    #dispatch
    #prevExternalStateJson
    
    constructor () {
      super() 
      this.attachShadow({mode: 'open'}).appendChild(document.createElement('div'))  
    }
    
    connectedCallback () { 
      const elem = this
      const opts = fn(elem)
      
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
          if (state===undefined) return
          if (opts.externalState) {
            const newExternalState = opts.externalState(state)
            const newExternalStateJson = JSON.stringify(newExternalState)
            if (newExternalStateJson !== this.#prevExternalStateJson) {
              this.#prevExternalStateJson = newExternalStateJson;
              elem.dispatchEvent(new CustomEvent(`stateChange`, { detail: newExternalState }))
            }
          } else {
            elem.dispatchEvent(new CustomEvent(`stateChange`, { detail: state }))
          }
          return state
        })
        
        const orgDispatch = opts.dispatch
        opts.dispatch = orgDispatch ? d => stateChangeMw(orgDispatch(d)) :  d => stateChangeMw(d)
      }
      
      // prevent view renders after disconnection
      if (opts.view) {
        const viewFn = opts.view
        opts.view = s => s===undefined ? '' : viewFn(s)
      }
      
      let styleSheets = []

      if (opts.style) {
        let ss = new CSSStyleSheet()
        ss.replaceSync(opts.style)
        styleSheets = styleSheets.concat(ss)
      }

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
          if (element === document) return styleSheets
          if (!element.parentElement) return cloneStyleSheets(document).concat(styleSheets)
          return cloneStyleSheets(element.parentElement).concat(styleSheets)
        }

        styleSheets = styleSheets.concat(cloneStyleSheets(this))
      }

      if (styleSheets.length > 0) elem.shadowRoot.adoptedStyleSheets = styleSheets
      
      // start app and save disaptch fn
      this.#dispatch = app({ init: opts.init, view: opts.view, subscriptions: opts.subscriptions, node: elem.shadowRoot.firstChild , dispatch: opts.dispatch }) 
      
      // map any entry in methods to an elem property dispatching an action
      if (opts.methods) { 
        const methodsProps = Object.fromEntries(
          Object.entries(opts.methods).map(
            ([name, action]) => [name, (...args) => this.#dispatch(action, args.length>1 ? args : args[0]) ]
          )
        )
        Object.assign(elem, methodsProps)
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
