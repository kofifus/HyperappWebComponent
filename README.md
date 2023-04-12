# HyperappComponent
Hyperapp support for Web Components  
&nbsp;   
## Syntax:
```
componentApp(
  componentName,     // component name 
  elem => { 
    init?,           // passed to hyperApp 
    view,            // passed to hyperApp
    subscriptions?,  // passed to hyperApp 
    dispatch?,       // passed to hyperApp 
    externalState?,  // state transform for the `onStateChange` event 
    methods?,        // element methods 
    properties?,     // element properties 
    cloneCSS?        // boolean for cloning host CSS
  }
)
```
&nbsp;   

## Usage:

HyperComponent provides four mechanisms for communicating between the host and the component:  
&nbsp;   
### State change notification

Here the component notifies the host whenever it's state changes. If `externalState` is provided, the component will invoke it on the state before attaching it to the event `detail` property:

```
componentApp('counter-', elem => {
  const Change = delta => s => ({ ...s, counter: s.counter + delta });
  
  return {
    init: { counter: 0},
    view: s => html`
      <div class="counter">
        <h1>${s.counter}</h1>
        <button onclick=${s => ({ ...s, counter: s.counter + 1 }}>+</button>
      </div>`,
    externalState: s => ({ counterValue: s.counter }),
  }
})

componentApp('game-', elem => {
  const CounterStateChange = (s, ev) => ({...s, counterValue: ev.detail.counterValue})

  return {
    init: { counterValue: 0 },
    view: state => html`<counter- onstateChange=${CounterStateChange} />`, 
  }
})
```

`game` recieves a notification on a `counter` state change and here merges that state into it's own.

`externalState` allows the component to only expose a part or a modified version of it's state to the outside. If omitted it defaults to `s=>s`. To prevent exposing the state use `s=>undefined`

`ev.srcElement` contains the source component  
&nbsp;   
### Trigger a host event

Here the component triggers a host event using an Effect:

```
componentApp('game-', elem => {
  const StateChange = (s, ev) => [ 
    { ...s, counterValue: ev.detail.counterValue },
    ev.detail.counterValue==10 && elem.events.finish.effect
  ]
  
  return {
    init: { counterValue: 0 },
    view: s => html`<counter- onstateChange=${StateChange} />`, 
  }
})


componentApp('flow-', elem => {
  return {  
    init: { mode: 'start' },
    view: s => html`<game- onfinish=${s => ({ ...s, mode: 'finish' }} />`
  }
})
```

`elem.events.finish.effect` triggers the `finish` event on the host (with a payload if provided) when `counterValue` reaches 10  
&nbsp;   
### Invoke a compenent's method

Here the host invoke a method on the component:
```
componentApp('score-', elem => {
  return {
    init: { count: 0 },
    view: s => html`${s.count}`, 
    methods: {
      addPoint: s => ({ ...s, count: s.count + 1 }), 
    },
  }
})

componentApp('flow-', elem => {
  const getSubComponent = name => elem.shadowRoot.querySelector(name);
  
  const Action = s => {
    const score = getSubComponent('score-');
    return [ s, score && (dispatch => score.addPoint()) ];    
  }
  
  return {  
    view: s => html`
      <score- />
      <button onclick=${Action}></button>`     
  }
})
```

`Action` invokes score's method `addPoint` dispatching the attached action.  
Note the check for `score` is not necessary here, but in actions triggered from `init` the element does not exist yet.  
&nbsp;   
### Change a component's property

```
componentApp('score-', elem => {
    init: { scoreCount: 0 },
    view: s => html`${s.scoreCount}`, 
    properties: {
      counter: (s, v) => ({...s, scoreCount: Number(v) })
    }
})

componentApp('flow-', elem => { 
 init: { flowCount: 0 },
  view: s => html`
    <score- counter=${s.flowCount}/>
    <button onclick=${s => ({...s, flowCount: flowCount+1 })}></button>`     
})
```

Every time the button is clicked, score's property `counter` changes trigerring the attached action in score.  
&nbsp;   
### Full example
[flems](https://tinyurl.com/yp7kvmxf)









