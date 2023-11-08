(function () {
	'use strict';

	var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
	/** @returns {void} */
	function noop$1() {}

	const identity = (x) => x;

	/**
	 * @template T
	 * @template S
	 * @param {T} tar
	 * @param {S} src
	 * @returns {T & S}
	 */
	function assign(tar, src) {
		// @ts-ignore
		for (const k in src) tar[k] = src[k];
		return /** @type {T & S} */ (tar);
	}

	// Adapted from https://github.com/then/is-promise/blob/master/index.js
	// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
	/**
	 * @param {any} value
	 * @returns {value is PromiseLike<any>}
	 */
	function is_promise(value) {
		return (
			!!value &&
			(typeof value === 'object' || typeof value === 'function') &&
			typeof (/** @type {any} */ (value).then) === 'function'
		);
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop$1;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function create_slot(definition, ctx, $$scope, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, $$scope, fn) {
		return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
	}

	function get_slot_changes(definition, $$scope, dirty, fn) {
		if (definition[2] && fn) {
			const lets = definition[2](fn(dirty));
			if ($$scope.dirty === undefined) {
				return lets;
			}
			if (typeof lets === 'object') {
				const merged = [];
				const len = Math.max($$scope.dirty.length, lets.length);
				for (let i = 0; i < len; i += 1) {
					merged[i] = $$scope.dirty[i] | lets[i];
				}
				return merged;
			}
			return $$scope.dirty | lets;
		}
		return $$scope.dirty;
	}

	/** @returns {void} */
	function update_slot_base(
		slot,
		slot_definition,
		ctx,
		$$scope,
		slot_changes,
		get_slot_context_fn
	) {
		if (slot_changes) {
			const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
			slot.p(slot_context, slot_changes);
		}
	}

	/** @returns {any[] | -1} */
	function get_all_dirty_from_scope($$scope) {
		if ($$scope.ctx.length > 32) {
			const dirty = [];
			const length = $$scope.ctx.length / 32;
			for (let i = 0; i < length; i++) {
				dirty[i] = -1;
			}
			return dirty;
		}
		return -1;
	}

	function set_store_value(store, ret, value) {
		store.set(value);
		return ret;
	}

	function action_destroyer(action_result) {
		return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop$1;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {string} style_sheet_id
	 * @param {string} styles
	 * @returns {void}
	 */
	function append_styles(target, style_sheet_id, styles) {
		const append_styles_to = get_root_for_style(target);
		if (!append_styles_to.getElementById(style_sheet_id)) {
			const style = element('style');
			style.id = style_sheet_id;
			style.textContent = styles;
			append_stylesheet(append_styles_to, style);
		}
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {HTMLInputElement[]} group
	 * @returns {{ p(...inputs: HTMLInputElement[]): void; r(): void; }}
	 */
	function init_binding_group(group) {
		/**
		 * @type {HTMLInputElement[]} */
		let _inputs;
		return {
			/* push */ p(...inputs) {
				_inputs = inputs;
				_inputs.forEach((input) => group.push(input));
			},
			/* remove */ r() {
				_inputs.forEach((input) => group.splice(group.indexOf(input), 1));
			}
		};
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data(text, data) {
		data = '' + data;
		if (text.data === data) return;
		text.data = /** @type {string} */ (data);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
	 *
	 * Component events created with `createEventDispatcher` create a
	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
	 * property and can contain any type of data.
	 *
	 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
	 * ```ts
	 * const dispatch = createEventDispatcher<{
	 *  loaded: never; // does not take a detail argument
	 *  change: string; // takes a detail argument of type string, which is required
	 *  optional: number | null; // takes an optional detail argument of type number
	 * }>();
	 * ```
	 *
	 * https://svelte.dev/docs/svelte#createeventdispatcher
	 * @template {Record<string, any>} [EventMap=any]
	 * @returns {import('./public.js').EventDispatcher<EventMap>}
	 */
	function createEventDispatcher() {
		const component = get_current_component();
		return (type, detail, { cancelable = false } = {}) => {
			const callbacks = component.$$.callbacks[type];
			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
				callbacks.slice().forEach((fn) => {
					fn.call(component, event);
				});
				return !event.defaultPrevented;
			}
			return true;
		};
	}

	/**
	 * Associates an arbitrary `context` object with the current component and the specified `key`
	 * and returns that object. The context is then available to children of the component
	 * (including slotted content) with `getContext`.
	 *
	 * Like lifecycle functions, this must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#setcontext
	 * @template T
	 * @param {any} key
	 * @param {T} context
	 * @returns {T}
	 */
	function setContext(key, context) {
		get_current_component().$$.context.set(key, context);
		return context;
	}

	/**
	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
	 * Must be called during component initialisation.
	 *
	 * https://svelte.dev/docs/svelte#getcontext
	 * @template T
	 * @param {any} key
	 * @returns {T}
	 */
	function getContext(key) {
		return get_current_component().$$.context.get(key);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	/** @returns {void} */
	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @param {boolean} intro
	 * @returns {{ run(b: 0 | 1): void; end(): void; }}
	 */
	function create_bidirectional_transition(node, fn, params, intro) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'both' };
		let config = fn(node, params, options);
		let t = intro ? 0 : 1;

		/**
		 * @type {Program | null} */
		let running_program = null;

		/**
		 * @type {PendingProgram | null} */
		let pending_program = null;
		let animation_name = null;

		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function clear_animation() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @param {PendingProgram} program
		 * @param {number} duration
		 * @returns {Program}
		 */
		function init(program, duration) {
			const d = /** @type {Program['d']} */ (program.b - t);
			duration *= Math.abs(d);
			return {
				a: t,
				b: program.b,
				d,
				duration,
				start: program.start,
				end: program.start + duration,
				group: program.group
			};
		}

		/**
		 * @param {INTRO | OUTRO} b
		 * @returns {void}
		 */
		function go(b) {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop$1,
				css
			} = config || null_transition;

			/**
			 * @type {PendingProgram} */
			const program = {
				start: now() + delay,
				b
			};

			if (!b) {
				// @ts-ignore todo: improve typings
				program.group = outros;
				outros.r += 1;
			}

			if ('inert' in node) {
				if (b) {
					if (original_inert_value !== undefined) {
						// aborted/reversed outro — restore previous inert value
						node.inert = original_inert_value;
					}
				} else {
					original_inert_value = /** @type {HTMLElement} */ (node).inert;
					node.inert = true;
				}
			}

			if (running_program || pending_program) {
				pending_program = program;
			} else {
				// if this is an intro, and there's a delay, we need to do
				// an initial tick and/or apply CSS animation immediately
				if (css) {
					clear_animation();
					animation_name = create_rule(node, t, b, duration, delay, easing, css);
				}
				if (b) tick(0, 1);
				running_program = init(program, duration);
				add_render_callback(() => dispatch(node, b, 'start'));
				loop((now) => {
					if (pending_program && now > pending_program.start) {
						running_program = init(pending_program, duration);
						pending_program = null;
						dispatch(node, running_program.b, 'start');
						if (css) {
							clear_animation();
							animation_name = create_rule(
								node,
								t,
								running_program.b,
								running_program.duration,
								0,
								easing,
								config.css
							);
						}
					}
					if (running_program) {
						if (now >= running_program.end) {
							tick((t = running_program.b), 1 - t);
							dispatch(node, running_program.b, 'end');
							if (!pending_program) {
								// we're done
								if (running_program.b) {
									// intro — we can tidy up immediately
									clear_animation();
								} else {
									// outro — needs to be coordinated
									if (!--running_program.group.r) run_all(running_program.group.c);
								}
							}
							running_program = null;
						} else if (now >= running_program.start) {
							const p = now - running_program.start;
							t = running_program.a + running_program.d * easing(p / running_program.duration);
							tick(t, 1 - t);
						}
					}
					return !!(running_program || pending_program);
				});
			}
		}
		return {
			run(b) {
				if (is_function(config)) {
					wait().then(() => {
						const opts = { direction: b ? 'in' : 'out' };
						// @ts-ignore
						config = config(opts);
						go(b);
					});
				} else {
					go(b);
				}
			},
			end() {
				clear_animation();
				running_program = pending_program = null;
			}
		};
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	/**
	 * @template T
	 * @param {Promise<T>} promise
	 * @param {import('./private.js').PromiseInfo<T>} info
	 * @returns {boolean}
	 */
	function handle_promise(promise, info) {
		const token = (info.token = {});
		/**
		 * @param {import('./private.js').FragmentFactory} type
		 * @param {0 | 1 | 2} index
		 * @param {number} [key]
		 * @param {any} [value]
		 * @returns {void}
		 */
		function update(type, index, key, value) {
			if (info.token !== token) return;
			info.resolved = value;
			let child_ctx = info.ctx;
			if (key !== undefined) {
				child_ctx = child_ctx.slice();
				child_ctx[key] = value;
			}
			const block = type && (info.current = type)(child_ctx);
			let needs_flush = false;
			if (info.block) {
				if (info.blocks) {
					info.blocks.forEach((block, i) => {
						if (i !== index && block) {
							group_outros();
							transition_out(block, 1, 1, () => {
								if (info.blocks[i] === block) {
									info.blocks[i] = null;
								}
							});
							check_outros();
						}
					});
				} else {
					info.block.d(1);
				}
				block.c();
				transition_in(block, 1);
				block.m(info.mount(), info.anchor);
				needs_flush = true;
			}
			info.block = block;
			if (info.blocks) info.blocks[index] = block;
			if (needs_flush) {
				flush();
			}
		}
		if (is_promise(promise)) {
			const current_component = get_current_component();
			promise.then(
				(value) => {
					set_current_component(current_component);
					update(info.then, 1, info.value, value);
					set_current_component(null);
				},
				(error) => {
					set_current_component(current_component);
					update(info.catch, 2, info.error, error);
					set_current_component(null);
					if (!info.hasCatch) {
						throw error;
					}
				}
			);
			// if we previously had a then/catch block, destroy it
			if (info.current !== info.pending) {
				update(info.pending, 0);
				return true;
			}
		} else {
			if (info.current !== info.then) {
				update(info.then, 1, info.value, promise);
				return true;
			}
			info.resolved = /** @type {T} */ (promise);
		}
	}

	/** @returns {void} */
	function update_await_block_branch(info, ctx, dirty) {
		const child_ctx = ctx.slice();
		const { resolved } = info;
		if (info.current === info.then) {
			child_ctx[info.value] = resolved;
		}
		if (info.current === info.catch) {
			child_ctx[info.error] = resolved;
		}
		info.block.p(child_ctx, dirty);
	}

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function bind$1(component, name, callback) {
		const index = component.$$.props[name];
		if (index !== undefined) {
			component.$$.bound[index] = callback;
			callback(component.$$.ctx[index]);
		}
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop$1,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop$1;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop$1;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	const PUBLIC_VERSION = '4';

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	const subscriber_queue = [];

	/**
	 * Creates a `Readable` store that allows reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#readable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function readable(value, start) {
		return {
			subscribe: writable(value, start).subscribe
		};
	}

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop$1) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop$1) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop$1;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>, set: (value: T) => void, update: (fn: import('./public.js').Updater<T>) => void) => import('./public.js').Unsubscriber | void} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * Derived value store by synchronizing one or more readable stores and
	 * applying an aggregation function over its input values.
	 *
	 * https://svelte.dev/docs/svelte-store#derived
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @overload
	 * @param {S} stores - input stores
	 * @param {(values: import('./private.js').StoresValues<S>) => T} fn - function callback that aggregates the values
	 * @param {T} [initial_value] - initial value
	 * @returns {import('./public.js').Readable<T>}
	 */

	/**
	 * @template {import('./private.js').Stores} S
	 * @template T
	 * @param {S} stores
	 * @param {Function} fn
	 * @param {T} [initial_value]
	 * @returns {import('./public.js').Readable<T>}
	 */
	function derived(stores, fn, initial_value) {
		const single = !Array.isArray(stores);
		/** @type {Array<import('./public.js').Readable<any>>} */
		const stores_array = single ? [stores] : stores;
		if (!stores_array.every(Boolean)) {
			throw new Error('derived() expects stores as input, got a falsy value');
		}
		const auto = fn.length < 2;
		return readable(initial_value, (set, update) => {
			let started = false;
			const values = [];
			let pending = 0;
			let cleanup = noop$1;
			const sync = () => {
				if (pending) {
					return;
				}
				cleanup();
				const result = fn(single ? values[0] : values, set, update);
				if (auto) {
					set(result);
				} else {
					cleanup = is_function(result) ? result : noop$1;
				}
			};
			const unsubscribers = stores_array.map((store, i) =>
				subscribe(
					store,
					(value) => {
						values[i] = value;
						pending &= ~(1 << i);
						if (started) {
							sync();
						}
					},
					() => {
						pending |= 1 << i;
					}
				)
			);
			started = true;
			sync();
			return function stop() {
				run_all(unsubscribers);
				cleanup();
				// We need to set this to false because callbacks can still happen despite having unsubscribed:
				// Callbacks might already be placed in the queue which doesn't know it should no longer
				// invoke this derived store.
				started = false;
			};
		});
	}

	const contributionValue = writable(1); //Number of strees [default 1]
	const processingPayment = writable(false);
	const successPayment = writable(false);
	const stripeClientSecret = writable("");
	const stripePaymentIntentId = writable("");

	const formErrors = writable({ firstName: "", lastName: "", email: ""});

	const userForm = writable({
	    contributionFrequency: 'Monthly', //Once or Monthly [default Once]

	    //personal information
	    firstName: '',
	    lastName: '',
	    email: '',

	    //address information
	    address: '',
	    city: '',
	    postalCode: '',
	    country: '',
	});

	// export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) * 4.80).toFixed(2) )

	//Quick/dirty, to refactor
	//export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) == 1 ? 4.80 : ( Number($contributionValue ) == 4 ? 18.80 : ( Number($contributionValue ) == 11 ? 49.80 : 85.00) ) ).toFixed(2) )

	const price = derived(contributionValue, $contributionValue => ( 
	    Number($contributionValue ) == 1 ? 4.80 : ( Number($contributionValue ) == 4 ? 18.80 : ( Number($contributionValue ) == 11 ? 49.80 : 85.00) ) ).toFixed(2) 
	);

	const totalPrice = derived([price, userForm], ([$price, $userForm]) => 
	    $userForm.contributionFrequency == "Once" ? $price : ( $price - ( $price * 0.15) ).toFixed(2)
	);

	var translations = {
	    en: {
	        "homepage.header": "Plant more trees",
	        "homepage.message": "Now it's your turn! Planting trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster biodiversity. Join us in this vital mission for a greener, harmonious future!",
	        "homepage.next": "Next",
	        "homepage.back": "Back",

	        "form.step.info":"Your Info",
	        "form.step.payment":"Payment",
	        "form.step.certificate":"Certificate",

	        "form.plantOnce": "Plant Once",
	        "form.plantMonthly": "Plant Monthly",
	        "form.plantMonthlySave": "Save 15%",

	        "form.how_many_trees": "How many trees would you like to plant?",
	        "form.firstName": "First Name",
	        "form.lastName": "Last Name",
	        "form.email": "Email",
	        "form.address": "Address",
	        "form.city": "City",
	        "form.postalCode": "Postal Code",
	        "form.country": "Country",

	        "form.fieldsValidation" : "Please make sure the first name, last name and email fields are not empty.",
	        "form.firstNameValidation": "First name field is required.",
	        "form.lastNameValidation": "Last name field is required.",
	        "form.emailValidation" : "Please enter a valid email address",

	        "payment.thankyou": "Thank you for your impact purchase!",
	        "payment.pleaseWait": "Please wait...",
	        "payment.processingPayment": "Processing your payment, please wait...",
	        "payment.pay": "Pay",

	        "certificate.thankyou": "Thank you",
	        "certificate.message": "Check your email soon for your personalized certificate. Can't wait? Download instantly.",
	        "certificate.download": "Download Certificate",

	    },
	    de: {
	        "homepage.header": "Mehr Bäume pflanzen",
	        "homepage.message": "Jetzt bist du dran! Das Pflanzen von Bäumen ist ein direkter Weg zur ökologischen und sozialen Nachhaltigkeit. Sie reinigen unsere Luft, speichern Kohlenstoff und fördern die Artenvielfalt. Unterstützen Sie uns bei dieser wichtigen Aufgabe für eine grünere, harmonische Zukunft!",
	        "homepage.next": "Weiter",
	        "homepage.back": "Zurück",

	        "form.step.info":"Deine Infos",
	        "form.step.payment":"Zahlung",
	        "form.step.certificate":"Zertifikat",

	        "form.plantOnce": "Einmalig",
	        "form.plantMonthly": "Monatlich",
	        "form.plantMonthlySave": "15% Sparen",

	        "form.how_many_trees": "Wie viele Bäume möchten Sie pflanzen?",
	        "form.firstName": "Vorname",
	        "form.lastName": "Nachname",
	        "form.email": "E-mail",
	        "form.address": "Adresse",
	        "form.city": "Stadt",
	        "form.postalCode": "Postleitzahl",
	        "form.country": "Land",

	        "form.fieldsValidation" : "Bitte stellen Sie sicher, dass die Felder „Vorname“, „Nachname“ und „E-Mail“ nicht leer sind.",
	        "form.firstNameValidation": "Vorname muss ausgefüllt sein.",
	        "form.lastNameValidation": "Nachname muss ausgefüllt sein.",
	        "form.emailValidation" : "Bitte geben Sie eine gültige E-Mail-Adresse ein",

	        "payment.thankyou": "Vielen Dank für Ihren Impact-Kauf!",
	        "payment.pleaseWait": "Bitte warten...",
	        "payment.processingPayment": "Ihre Zahlung wird bearbeitet. Bitte warten Sie...",
	        "payment.pay": "Zahlen",

	        "certificate.thankyou": "Danke",
	        "certificate.message": "Wir senden dir das Zertifikat per E-Mail zu. Du kannst es aber auch direkt herunterladen.",
	        "certificate.download": "Zertifikat herunterladen",
	    },
	};

	const locale = writable("de");

	function translate(locale, key, vars) {
	  // Let's throw some errors if we're trying to use keys/locales that don't exist.
	  // We could improve this by using Typescript and/or fallback values.
	  if (!key) throw new Error("no key provided to $t()");
	  if (!locale) throw new Error(`no translation for key "${key}"`);

	  // Grab the translation from the translations object.
	  let text = translations[locale][key];

	  if (!text) throw new Error(`no translation found for ${locale}.${key}`);

	  // Replace any passed in variables in the translation string.
	  Object.keys(vars).map((k) => {
	    const regex = new RegExp(`{{${k}}}`, "g");
	    text = text.replace(regex, vars[k]);
	  });

	  return text;
	}

	derived(locale, ($locale) => (key, vars = {}) =>
	  translate($locale, key, vars)
	);

	/* components\ui\ProgressBar.svelte generated by Svelte v4.2.1 */

	function add_css$4(target) {
		append_styles(target, "svelte-9k8xcy", ".step-tab.svelte-9k8xcy{color:#C5C2C0;border-bottom:2px solid #F2EFED;width:30%;font-size:13px;font-weight:600}.step-tab-active.svelte-9k8xcy{color:#5F753D !important;border-bottom:2px solid #5F753D !important}.progress-container.svelte-9k8xcy{display:flex;justify-content:space-between;position:relative;margin-bottom:30px;max-width:100%;width:75%;margin:0 auto !important;text-align:left}.progress-container.svelte-9k8xcy::before{content:'';position:absolute;top:50%;left:0;transform:translateY(-50%);height:4px;width:100%;z-index:-1}.progress.svelte-9k8xcy{background-color:#5F753D;position:absolute;top:50%;left:0;transform:translateY(-50%);height:4px;width:0%;transition:0.4s ease}");
	}

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[9] = list[i];
		child_ctx[11] = i;
		return child_ctx;
	}

	// (47:1) {#each steps as step, i}
	function create_each_block(ctx) {
		let div;
		let t_1_value = /*progressSteps*/ ctx[4][/*i*/ ctx[11]].caption + "";
		let t_1;
		let div_class_value;

		return {
			c() {
				div = element("div");
				t_1 = text(t_1_value);

				attr(div, "class", div_class_value = "step-tab " + (/*i*/ ctx[11] == /*currentActive*/ ctx[0] - 1
				? 'step-tab-active'
				: '') + " svelte-9k8xcy");

				attr(div, "data-title", /*progressSteps*/ ctx[4][/*i*/ ctx[11]].caption);
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, t_1);
			},
			p(ctx, dirty) {
				if (dirty & /*currentActive*/ 1 && div_class_value !== (div_class_value = "step-tab " + (/*i*/ ctx[11] == /*currentActive*/ ctx[0] - 1
				? 'step-tab-active'
				: '') + " svelte-9k8xcy")) {
					attr(div, "class", div_class_value);
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment$b(ctx) {
		let div1;
		let div0;
		let t_1;
		let each_value = ensure_array_like(/*steps*/ ctx[1]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				t_1 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				attr(div0, "class", "progress svelte-9k8xcy");
				set_style(div0, "visibility", "hidden");
				attr(div1, "class", "progress-container svelte-9k8xcy");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				/*div0_binding*/ ctx[6](div0);
				append(div1, t_1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				/*div1_binding*/ ctx[7](div1);
			},
			p(ctx, [dirty]) {
				if (dirty & /*currentActive, progressSteps, steps*/ 19) {
					each_value = ensure_array_like(/*steps*/ ctx[1]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}
			},
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				/*div0_binding*/ ctx[6](null);
				destroy_each(each_blocks, detaching);
				/*div1_binding*/ ctx[7](null);
			}
		};
	}

	function instance$b($$self, $$props, $$invalidate) {
		let { steps = [], currentActive = 1 } = $$props;
		let circles, progress;

		let progressSteps = [
			{ id: 1, caption: "Your Info" },
			{ id: 2, caption: "Payment" },
			{ id: 3, caption: "Certificate" }
		];

		const handleProgress = stepIncrement => {
			$$invalidate(2, circles = document.querySelectorAll('.step-tab'));

			if (stepIncrement == 1) {
				$$invalidate(0, currentActive++, currentActive);

				if (currentActive > circles.length) {
					$$invalidate(0, currentActive = circles.length);
				}
			} else {
				$$invalidate(0, currentActive--, currentActive);

				if (currentActive < 1) {
					$$invalidate(0, currentActive = 1);
				}
			}

			update();
		};

		function update() {
			circles.forEach((circle, idx) => {
				if (idx < currentActive) {
					circle.classList.add('active');
				} else {
					circle.classList.remove('active');
				}
			});

			const actives = document.querySelectorAll('.active');
			$$invalidate(3, progress.style.width = (actives.length - 1) / (circles.length - 1) * 100 + '%', progress);
		}

		function div0_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				progress = $$value;
				$$invalidate(3, progress);
			});
		}

		function div1_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				circles = $$value;
				$$invalidate(2, circles);
			});
		}

		$$self.$$set = $$props => {
			if ('steps' in $$props) $$invalidate(1, steps = $$props.steps);
			if ('currentActive' in $$props) $$invalidate(0, currentActive = $$props.currentActive);
		};

		return [
			currentActive,
			steps,
			circles,
			progress,
			progressSteps,
			handleProgress,
			div0_binding,
			div1_binding
		];
	}

	class ProgressBar extends SvelteComponent {
		constructor(options) {
			super();

			init(
				this,
				options,
				instance$b,
				create_fragment$b,
				safe_not_equal,
				{
					steps: 1,
					currentActive: 0,
					handleProgress: 5
				},
				add_css$4
			);
		}

		get handleProgress() {
			return this.$$.ctx[5];
		}
	}

	function bind(fn, thisArg) {
	  return function wrap() {
	    return fn.apply(thisArg, arguments);
	  };
	}

	// utils is a library of generic helper functions non-specific to axios

	const {toString} = Object.prototype;
	const {getPrototypeOf} = Object;

	const kindOf = (cache => thing => {
	    const str = toString.call(thing);
	    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
	})(Object.create(null));

	const kindOfTest = (type) => {
	  type = type.toLowerCase();
	  return (thing) => kindOf(thing) === type
	};

	const typeOfTest = type => thing => typeof thing === type;

	/**
	 * Determine if a value is an Array
	 *
	 * @param {Object} val The value to test
	 *
	 * @returns {boolean} True if value is an Array, otherwise false
	 */
	const {isArray} = Array;

	/**
	 * Determine if a value is undefined
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if the value is undefined, otherwise false
	 */
	const isUndefined = typeOfTest('undefined');

	/**
	 * Determine if a value is a Buffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Buffer, otherwise false
	 */
	function isBuffer(val) {
	  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
	    && isFunction(val.constructor.isBuffer) && val.constructor.isBuffer(val);
	}

	/**
	 * Determine if a value is an ArrayBuffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
	 */
	const isArrayBuffer = kindOfTest('ArrayBuffer');


	/**
	 * Determine if a value is a view on an ArrayBuffer
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
	 */
	function isArrayBufferView(val) {
	  let result;
	  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
	    result = ArrayBuffer.isView(val);
	  } else {
	    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
	  }
	  return result;
	}

	/**
	 * Determine if a value is a String
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a String, otherwise false
	 */
	const isString = typeOfTest('string');

	/**
	 * Determine if a value is a Function
	 *
	 * @param {*} val The value to test
	 * @returns {boolean} True if value is a Function, otherwise false
	 */
	const isFunction = typeOfTest('function');

	/**
	 * Determine if a value is a Number
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Number, otherwise false
	 */
	const isNumber = typeOfTest('number');

	/**
	 * Determine if a value is an Object
	 *
	 * @param {*} thing The value to test
	 *
	 * @returns {boolean} True if value is an Object, otherwise false
	 */
	const isObject = (thing) => thing !== null && typeof thing === 'object';

	/**
	 * Determine if a value is a Boolean
	 *
	 * @param {*} thing The value to test
	 * @returns {boolean} True if value is a Boolean, otherwise false
	 */
	const isBoolean = thing => thing === true || thing === false;

	/**
	 * Determine if a value is a plain Object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a plain Object, otherwise false
	 */
	const isPlainObject = (val) => {
	  if (kindOf(val) !== 'object') {
	    return false;
	  }

	  const prototype = getPrototypeOf(val);
	  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in val) && !(Symbol.iterator in val);
	};

	/**
	 * Determine if a value is a Date
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Date, otherwise false
	 */
	const isDate = kindOfTest('Date');

	/**
	 * Determine if a value is a File
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a File, otherwise false
	 */
	const isFile = kindOfTest('File');

	/**
	 * Determine if a value is a Blob
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Blob, otherwise false
	 */
	const isBlob = kindOfTest('Blob');

	/**
	 * Determine if a value is a FileList
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a File, otherwise false
	 */
	const isFileList = kindOfTest('FileList');

	/**
	 * Determine if a value is a Stream
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a Stream, otherwise false
	 */
	const isStream = (val) => isObject(val) && isFunction(val.pipe);

	/**
	 * Determine if a value is a FormData
	 *
	 * @param {*} thing The value to test
	 *
	 * @returns {boolean} True if value is an FormData, otherwise false
	 */
	const isFormData = (thing) => {
	  let kind;
	  return thing && (
	    (typeof FormData === 'function' && thing instanceof FormData) || (
	      isFunction(thing.append) && (
	        (kind = kindOf(thing)) === 'formdata' ||
	        // detect form-data instance
	        (kind === 'object' && isFunction(thing.toString) && thing.toString() === '[object FormData]')
	      )
	    )
	  )
	};

	/**
	 * Determine if a value is a URLSearchParams object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
	 */
	const isURLSearchParams = kindOfTest('URLSearchParams');

	/**
	 * Trim excess whitespace off the beginning and end of a string
	 *
	 * @param {String} str The String to trim
	 *
	 * @returns {String} The String freed of excess whitespace
	 */
	const trim = (str) => str.trim ?
	  str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

	/**
	 * Iterate over an Array or an Object invoking a function for each item.
	 *
	 * If `obj` is an Array callback will be called passing
	 * the value, index, and complete array for each item.
	 *
	 * If 'obj' is an Object callback will be called passing
	 * the value, key, and complete object for each property.
	 *
	 * @param {Object|Array} obj The object to iterate
	 * @param {Function} fn The callback to invoke for each item
	 *
	 * @param {Boolean} [allOwnKeys = false]
	 * @returns {any}
	 */
	function forEach(obj, fn, {allOwnKeys = false} = {}) {
	  // Don't bother if no value provided
	  if (obj === null || typeof obj === 'undefined') {
	    return;
	  }

	  let i;
	  let l;

	  // Force an array if not already something iterable
	  if (typeof obj !== 'object') {
	    /*eslint no-param-reassign:0*/
	    obj = [obj];
	  }

	  if (isArray(obj)) {
	    // Iterate over array values
	    for (i = 0, l = obj.length; i < l; i++) {
	      fn.call(null, obj[i], i, obj);
	    }
	  } else {
	    // Iterate over object keys
	    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
	    const len = keys.length;
	    let key;

	    for (i = 0; i < len; i++) {
	      key = keys[i];
	      fn.call(null, obj[key], key, obj);
	    }
	  }
	}

	function findKey(obj, key) {
	  key = key.toLowerCase();
	  const keys = Object.keys(obj);
	  let i = keys.length;
	  let _key;
	  while (i-- > 0) {
	    _key = keys[i];
	    if (key === _key.toLowerCase()) {
	      return _key;
	    }
	  }
	  return null;
	}

	const _global = (() => {
	  /*eslint no-undef:0*/
	  if (typeof globalThis !== "undefined") return globalThis;
	  return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
	})();

	const isContextDefined = (context) => !isUndefined(context) && context !== _global;

	/**
	 * Accepts varargs expecting each argument to be an object, then
	 * immutably merges the properties of each object and returns result.
	 *
	 * When multiple objects contain the same key the later object in
	 * the arguments list will take precedence.
	 *
	 * Example:
	 *
	 * ```js
	 * var result = merge({foo: 123}, {foo: 456});
	 * console.log(result.foo); // outputs 456
	 * ```
	 *
	 * @param {Object} obj1 Object to merge
	 *
	 * @returns {Object} Result of all merge properties
	 */
	function merge(/* obj1, obj2, obj3, ... */) {
	  const {caseless} = isContextDefined(this) && this || {};
	  const result = {};
	  const assignValue = (val, key) => {
	    const targetKey = caseless && findKey(result, key) || key;
	    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
	      result[targetKey] = merge(result[targetKey], val);
	    } else if (isPlainObject(val)) {
	      result[targetKey] = merge({}, val);
	    } else if (isArray(val)) {
	      result[targetKey] = val.slice();
	    } else {
	      result[targetKey] = val;
	    }
	  };

	  for (let i = 0, l = arguments.length; i < l; i++) {
	    arguments[i] && forEach(arguments[i], assignValue);
	  }
	  return result;
	}

	/**
	 * Extends object a by mutably adding to it the properties of object b.
	 *
	 * @param {Object} a The object to be extended
	 * @param {Object} b The object to copy properties from
	 * @param {Object} thisArg The object to bind function to
	 *
	 * @param {Boolean} [allOwnKeys]
	 * @returns {Object} The resulting value of object a
	 */
	const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
	  forEach(b, (val, key) => {
	    if (thisArg && isFunction(val)) {
	      a[key] = bind(val, thisArg);
	    } else {
	      a[key] = val;
	    }
	  }, {allOwnKeys});
	  return a;
	};

	/**
	 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	 *
	 * @param {string} content with BOM
	 *
	 * @returns {string} content value without BOM
	 */
	const stripBOM = (content) => {
	  if (content.charCodeAt(0) === 0xFEFF) {
	    content = content.slice(1);
	  }
	  return content;
	};

	/**
	 * Inherit the prototype methods from one constructor into another
	 * @param {function} constructor
	 * @param {function} superConstructor
	 * @param {object} [props]
	 * @param {object} [descriptors]
	 *
	 * @returns {void}
	 */
	const inherits = (constructor, superConstructor, props, descriptors) => {
	  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
	  constructor.prototype.constructor = constructor;
	  Object.defineProperty(constructor, 'super', {
	    value: superConstructor.prototype
	  });
	  props && Object.assign(constructor.prototype, props);
	};

	/**
	 * Resolve object with deep prototype chain to a flat object
	 * @param {Object} sourceObj source object
	 * @param {Object} [destObj]
	 * @param {Function|Boolean} [filter]
	 * @param {Function} [propFilter]
	 *
	 * @returns {Object}
	 */
	const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
	  let props;
	  let i;
	  let prop;
	  const merged = {};

	  destObj = destObj || {};
	  // eslint-disable-next-line no-eq-null,eqeqeq
	  if (sourceObj == null) return destObj;

	  do {
	    props = Object.getOwnPropertyNames(sourceObj);
	    i = props.length;
	    while (i-- > 0) {
	      prop = props[i];
	      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
	        destObj[prop] = sourceObj[prop];
	        merged[prop] = true;
	      }
	    }
	    sourceObj = filter !== false && getPrototypeOf(sourceObj);
	  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

	  return destObj;
	};

	/**
	 * Determines whether a string ends with the characters of a specified string
	 *
	 * @param {String} str
	 * @param {String} searchString
	 * @param {Number} [position= 0]
	 *
	 * @returns {boolean}
	 */
	const endsWith = (str, searchString, position) => {
	  str = String(str);
	  if (position === undefined || position > str.length) {
	    position = str.length;
	  }
	  position -= searchString.length;
	  const lastIndex = str.indexOf(searchString, position);
	  return lastIndex !== -1 && lastIndex === position;
	};


	/**
	 * Returns new array from array like object or null if failed
	 *
	 * @param {*} [thing]
	 *
	 * @returns {?Array}
	 */
	const toArray = (thing) => {
	  if (!thing) return null;
	  if (isArray(thing)) return thing;
	  let i = thing.length;
	  if (!isNumber(i)) return null;
	  const arr = new Array(i);
	  while (i-- > 0) {
	    arr[i] = thing[i];
	  }
	  return arr;
	};

	/**
	 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
	 * thing passed in is an instance of Uint8Array
	 *
	 * @param {TypedArray}
	 *
	 * @returns {Array}
	 */
	// eslint-disable-next-line func-names
	const isTypedArray = (TypedArray => {
	  // eslint-disable-next-line func-names
	  return thing => {
	    return TypedArray && thing instanceof TypedArray;
	  };
	})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

	/**
	 * For each entry in the object, call the function with the key and value.
	 *
	 * @param {Object<any, any>} obj - The object to iterate over.
	 * @param {Function} fn - The function to call for each entry.
	 *
	 * @returns {void}
	 */
	const forEachEntry = (obj, fn) => {
	  const generator = obj && obj[Symbol.iterator];

	  const iterator = generator.call(obj);

	  let result;

	  while ((result = iterator.next()) && !result.done) {
	    const pair = result.value;
	    fn.call(obj, pair[0], pair[1]);
	  }
	};

	/**
	 * It takes a regular expression and a string, and returns an array of all the matches
	 *
	 * @param {string} regExp - The regular expression to match against.
	 * @param {string} str - The string to search.
	 *
	 * @returns {Array<boolean>}
	 */
	const matchAll = (regExp, str) => {
	  let matches;
	  const arr = [];

	  while ((matches = regExp.exec(str)) !== null) {
	    arr.push(matches);
	  }

	  return arr;
	};

	/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
	const isHTMLForm = kindOfTest('HTMLFormElement');

	const toCamelCase = str => {
	  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
	    function replacer(m, p1, p2) {
	      return p1.toUpperCase() + p2;
	    }
	  );
	};

	/* Creating a function that will check if an object has a property. */
	const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

	/**
	 * Determine if a value is a RegExp object
	 *
	 * @param {*} val The value to test
	 *
	 * @returns {boolean} True if value is a RegExp object, otherwise false
	 */
	const isRegExp = kindOfTest('RegExp');

	const reduceDescriptors = (obj, reducer) => {
	  const descriptors = Object.getOwnPropertyDescriptors(obj);
	  const reducedDescriptors = {};

	  forEach(descriptors, (descriptor, name) => {
	    let ret;
	    if ((ret = reducer(descriptor, name, obj)) !== false) {
	      reducedDescriptors[name] = ret || descriptor;
	    }
	  });

	  Object.defineProperties(obj, reducedDescriptors);
	};

	/**
	 * Makes all methods read-only
	 * @param {Object} obj
	 */

	const freezeMethods = (obj) => {
	  reduceDescriptors(obj, (descriptor, name) => {
	    // skip restricted props in strict mode
	    if (isFunction(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
	      return false;
	    }

	    const value = obj[name];

	    if (!isFunction(value)) return;

	    descriptor.enumerable = false;

	    if ('writable' in descriptor) {
	      descriptor.writable = false;
	      return;
	    }

	    if (!descriptor.set) {
	      descriptor.set = () => {
	        throw Error('Can not rewrite read-only method \'' + name + '\'');
	      };
	    }
	  });
	};

	const toObjectSet = (arrayOrString, delimiter) => {
	  const obj = {};

	  const define = (arr) => {
	    arr.forEach(value => {
	      obj[value] = true;
	    });
	  };

	  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

	  return obj;
	};

	const noop = () => {};

	const toFiniteNumber = (value, defaultValue) => {
	  value = +value;
	  return Number.isFinite(value) ? value : defaultValue;
	};

	const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

	const DIGIT = '0123456789';

	const ALPHABET = {
	  DIGIT,
	  ALPHA,
	  ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
	};

	const generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
	  let str = '';
	  const {length} = alphabet;
	  while (size--) {
	    str += alphabet[Math.random() * length|0];
	  }

	  return str;
	};

	/**
	 * If the thing is a FormData object, return true, otherwise return false.
	 *
	 * @param {unknown} thing - The thing to check.
	 *
	 * @returns {boolean}
	 */
	function isSpecCompliantForm(thing) {
	  return !!(thing && isFunction(thing.append) && thing[Symbol.toStringTag] === 'FormData' && thing[Symbol.iterator]);
	}

	const toJSONObject = (obj) => {
	  const stack = new Array(10);

	  const visit = (source, i) => {

	    if (isObject(source)) {
	      if (stack.indexOf(source) >= 0) {
	        return;
	      }

	      if(!('toJSON' in source)) {
	        stack[i] = source;
	        const target = isArray(source) ? [] : {};

	        forEach(source, (value, key) => {
	          const reducedValue = visit(value, i + 1);
	          !isUndefined(reducedValue) && (target[key] = reducedValue);
	        });

	        stack[i] = undefined;

	        return target;
	      }
	    }

	    return source;
	  };

	  return visit(obj, 0);
	};

	const isAsyncFn = kindOfTest('AsyncFunction');

	const isThenable = (thing) =>
	  thing && (isObject(thing) || isFunction(thing)) && isFunction(thing.then) && isFunction(thing.catch);

	var utils = {
	  isArray,
	  isArrayBuffer,
	  isBuffer,
	  isFormData,
	  isArrayBufferView,
	  isString,
	  isNumber,
	  isBoolean,
	  isObject,
	  isPlainObject,
	  isUndefined,
	  isDate,
	  isFile,
	  isBlob,
	  isRegExp,
	  isFunction,
	  isStream,
	  isURLSearchParams,
	  isTypedArray,
	  isFileList,
	  forEach,
	  merge,
	  extend,
	  trim,
	  stripBOM,
	  inherits,
	  toFlatObject,
	  kindOf,
	  kindOfTest,
	  endsWith,
	  toArray,
	  forEachEntry,
	  matchAll,
	  isHTMLForm,
	  hasOwnProperty,
	  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
	  reduceDescriptors,
	  freezeMethods,
	  toObjectSet,
	  toCamelCase,
	  noop,
	  toFiniteNumber,
	  findKey,
	  global: _global,
	  isContextDefined,
	  ALPHABET,
	  generateString,
	  isSpecCompliantForm,
	  toJSONObject,
	  isAsyncFn,
	  isThenable
	};

	/**
	 * Create an Error with the specified message, config, error code, request and response.
	 *
	 * @param {string} message The error message.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [config] The config.
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 *
	 * @returns {Error} The created error.
	 */
	function AxiosError(message, code, config, request, response) {
	  Error.call(this);

	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.constructor);
	  } else {
	    this.stack = (new Error()).stack;
	  }

	  this.message = message;
	  this.name = 'AxiosError';
	  code && (this.code = code);
	  config && (this.config = config);
	  request && (this.request = request);
	  response && (this.response = response);
	}

	utils.inherits(AxiosError, Error, {
	  toJSON: function toJSON() {
	    return {
	      // Standard
	      message: this.message,
	      name: this.name,
	      // Microsoft
	      description: this.description,
	      number: this.number,
	      // Mozilla
	      fileName: this.fileName,
	      lineNumber: this.lineNumber,
	      columnNumber: this.columnNumber,
	      stack: this.stack,
	      // Axios
	      config: utils.toJSONObject(this.config),
	      code: this.code,
	      status: this.response && this.response.status ? this.response.status : null
	    };
	  }
	});

	const prototype$1 = AxiosError.prototype;
	const descriptors = {};

	[
	  'ERR_BAD_OPTION_VALUE',
	  'ERR_BAD_OPTION',
	  'ECONNABORTED',
	  'ETIMEDOUT',
	  'ERR_NETWORK',
	  'ERR_FR_TOO_MANY_REDIRECTS',
	  'ERR_DEPRECATED',
	  'ERR_BAD_RESPONSE',
	  'ERR_BAD_REQUEST',
	  'ERR_CANCELED',
	  'ERR_NOT_SUPPORT',
	  'ERR_INVALID_URL'
	// eslint-disable-next-line func-names
	].forEach(code => {
	  descriptors[code] = {value: code};
	});

	Object.defineProperties(AxiosError, descriptors);
	Object.defineProperty(prototype$1, 'isAxiosError', {value: true});

	// eslint-disable-next-line func-names
	AxiosError.from = (error, code, config, request, response, customProps) => {
	  const axiosError = Object.create(prototype$1);

	  utils.toFlatObject(error, axiosError, function filter(obj) {
	    return obj !== Error.prototype;
	  }, prop => {
	    return prop !== 'isAxiosError';
	  });

	  AxiosError.call(axiosError, error.message, code, config, request, response);

	  axiosError.cause = error;

	  axiosError.name = error.name;

	  customProps && Object.assign(axiosError, customProps);

	  return axiosError;
	};

	// eslint-disable-next-line strict
	var httpAdapter = null;

	/**
	 * Determines if the given thing is a array or js object.
	 *
	 * @param {string} thing - The object or array to be visited.
	 *
	 * @returns {boolean}
	 */
	function isVisitable(thing) {
	  return utils.isPlainObject(thing) || utils.isArray(thing);
	}

	/**
	 * It removes the brackets from the end of a string
	 *
	 * @param {string} key - The key of the parameter.
	 *
	 * @returns {string} the key without the brackets.
	 */
	function removeBrackets(key) {
	  return utils.endsWith(key, '[]') ? key.slice(0, -2) : key;
	}

	/**
	 * It takes a path, a key, and a boolean, and returns a string
	 *
	 * @param {string} path - The path to the current key.
	 * @param {string} key - The key of the current object being iterated over.
	 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
	 *
	 * @returns {string} The path to the current key.
	 */
	function renderKey(path, key, dots) {
	  if (!path) return key;
	  return path.concat(key).map(function each(token, i) {
	    // eslint-disable-next-line no-param-reassign
	    token = removeBrackets(token);
	    return !dots && i ? '[' + token + ']' : token;
	  }).join(dots ? '.' : '');
	}

	/**
	 * If the array is an array and none of its elements are visitable, then it's a flat array.
	 *
	 * @param {Array<any>} arr - The array to check
	 *
	 * @returns {boolean}
	 */
	function isFlatArray(arr) {
	  return utils.isArray(arr) && !arr.some(isVisitable);
	}

	const predicates = utils.toFlatObject(utils, {}, null, function filter(prop) {
	  return /^is[A-Z]/.test(prop);
	});

	/**
	 * Convert a data object to FormData
	 *
	 * @param {Object} obj
	 * @param {?Object} [formData]
	 * @param {?Object} [options]
	 * @param {Function} [options.visitor]
	 * @param {Boolean} [options.metaTokens = true]
	 * @param {Boolean} [options.dots = false]
	 * @param {?Boolean} [options.indexes = false]
	 *
	 * @returns {Object}
	 **/

	/**
	 * It converts an object into a FormData object
	 *
	 * @param {Object<any, any>} obj - The object to convert to form data.
	 * @param {string} formData - The FormData object to append to.
	 * @param {Object<string, any>} options
	 *
	 * @returns
	 */
	function toFormData(obj, formData, options) {
	  if (!utils.isObject(obj)) {
	    throw new TypeError('target must be an object');
	  }

	  // eslint-disable-next-line no-param-reassign
	  formData = formData || new (FormData)();

	  // eslint-disable-next-line no-param-reassign
	  options = utils.toFlatObject(options, {
	    metaTokens: true,
	    dots: false,
	    indexes: false
	  }, false, function defined(option, source) {
	    // eslint-disable-next-line no-eq-null,eqeqeq
	    return !utils.isUndefined(source[option]);
	  });

	  const metaTokens = options.metaTokens;
	  // eslint-disable-next-line no-use-before-define
	  const visitor = options.visitor || defaultVisitor;
	  const dots = options.dots;
	  const indexes = options.indexes;
	  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
	  const useBlob = _Blob && utils.isSpecCompliantForm(formData);

	  if (!utils.isFunction(visitor)) {
	    throw new TypeError('visitor must be a function');
	  }

	  function convertValue(value) {
	    if (value === null) return '';

	    if (utils.isDate(value)) {
	      return value.toISOString();
	    }

	    if (!useBlob && utils.isBlob(value)) {
	      throw new AxiosError('Blob is not supported. Use a Buffer instead.');
	    }

	    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
	      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
	    }

	    return value;
	  }

	  /**
	   * Default visitor.
	   *
	   * @param {*} value
	   * @param {String|Number} key
	   * @param {Array<String|Number>} path
	   * @this {FormData}
	   *
	   * @returns {boolean} return true to visit the each prop of the value recursively
	   */
	  function defaultVisitor(value, key, path) {
	    let arr = value;

	    if (value && !path && typeof value === 'object') {
	      if (utils.endsWith(key, '{}')) {
	        // eslint-disable-next-line no-param-reassign
	        key = metaTokens ? key : key.slice(0, -2);
	        // eslint-disable-next-line no-param-reassign
	        value = JSON.stringify(value);
	      } else if (
	        (utils.isArray(value) && isFlatArray(value)) ||
	        ((utils.isFileList(value) || utils.endsWith(key, '[]')) && (arr = utils.toArray(value))
	        )) {
	        // eslint-disable-next-line no-param-reassign
	        key = removeBrackets(key);

	        arr.forEach(function each(el, index) {
	          !(utils.isUndefined(el) || el === null) && formData.append(
	            // eslint-disable-next-line no-nested-ternary
	            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
	            convertValue(el)
	          );
	        });
	        return false;
	      }
	    }

	    if (isVisitable(value)) {
	      return true;
	    }

	    formData.append(renderKey(path, key, dots), convertValue(value));

	    return false;
	  }

	  const stack = [];

	  const exposedHelpers = Object.assign(predicates, {
	    defaultVisitor,
	    convertValue,
	    isVisitable
	  });

	  function build(value, path) {
	    if (utils.isUndefined(value)) return;

	    if (stack.indexOf(value) !== -1) {
	      throw Error('Circular reference detected in ' + path.join('.'));
	    }

	    stack.push(value);

	    utils.forEach(value, function each(el, key) {
	      const result = !(utils.isUndefined(el) || el === null) && visitor.call(
	        formData, el, utils.isString(key) ? key.trim() : key, path, exposedHelpers
	      );

	      if (result === true) {
	        build(el, path ? path.concat(key) : [key]);
	      }
	    });

	    stack.pop();
	  }

	  if (!utils.isObject(obj)) {
	    throw new TypeError('data must be an object');
	  }

	  build(obj);

	  return formData;
	}

	/**
	 * It encodes a string by replacing all characters that are not in the unreserved set with
	 * their percent-encoded equivalents
	 *
	 * @param {string} str - The string to encode.
	 *
	 * @returns {string} The encoded string.
	 */
	function encode$1(str) {
	  const charMap = {
	    '!': '%21',
	    "'": '%27',
	    '(': '%28',
	    ')': '%29',
	    '~': '%7E',
	    '%20': '+',
	    '%00': '\x00'
	  };
	  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
	    return charMap[match];
	  });
	}

	/**
	 * It takes a params object and converts it to a FormData object
	 *
	 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
	 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
	 *
	 * @returns {void}
	 */
	function AxiosURLSearchParams(params, options) {
	  this._pairs = [];

	  params && toFormData(params, this, options);
	}

	const prototype = AxiosURLSearchParams.prototype;

	prototype.append = function append(name, value) {
	  this._pairs.push([name, value]);
	};

	prototype.toString = function toString(encoder) {
	  const _encode = encoder ? function(value) {
	    return encoder.call(this, value, encode$1);
	  } : encode$1;

	  return this._pairs.map(function each(pair) {
	    return _encode(pair[0]) + '=' + _encode(pair[1]);
	  }, '').join('&');
	};

	/**
	 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
	 * URI encoded counterparts
	 *
	 * @param {string} val The value to be encoded.
	 *
	 * @returns {string} The encoded value.
	 */
	function encode(val) {
	  return encodeURIComponent(val).
	    replace(/%3A/gi, ':').
	    replace(/%24/g, '$').
	    replace(/%2C/gi, ',').
	    replace(/%20/g, '+').
	    replace(/%5B/gi, '[').
	    replace(/%5D/gi, ']');
	}

	/**
	 * Build a URL by appending params to the end
	 *
	 * @param {string} url The base of the url (e.g., http://www.google.com)
	 * @param {object} [params] The params to be appended
	 * @param {?object} options
	 *
	 * @returns {string} The formatted url
	 */
	function buildURL(url, params, options) {
	  /*eslint no-param-reassign:0*/
	  if (!params) {
	    return url;
	  }
	  
	  const _encode = options && options.encode || encode;

	  const serializeFn = options && options.serialize;

	  let serializedParams;

	  if (serializeFn) {
	    serializedParams = serializeFn(params, options);
	  } else {
	    serializedParams = utils.isURLSearchParams(params) ?
	      params.toString() :
	      new AxiosURLSearchParams(params, options).toString(_encode);
	  }

	  if (serializedParams) {
	    const hashmarkIndex = url.indexOf("#");

	    if (hashmarkIndex !== -1) {
	      url = url.slice(0, hashmarkIndex);
	    }
	    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
	  }

	  return url;
	}

	class InterceptorManager {
	  constructor() {
	    this.handlers = [];
	  }

	  /**
	   * Add a new interceptor to the stack
	   *
	   * @param {Function} fulfilled The function to handle `then` for a `Promise`
	   * @param {Function} rejected The function to handle `reject` for a `Promise`
	   *
	   * @return {Number} An ID used to remove interceptor later
	   */
	  use(fulfilled, rejected, options) {
	    this.handlers.push({
	      fulfilled,
	      rejected,
	      synchronous: options ? options.synchronous : false,
	      runWhen: options ? options.runWhen : null
	    });
	    return this.handlers.length - 1;
	  }

	  /**
	   * Remove an interceptor from the stack
	   *
	   * @param {Number} id The ID that was returned by `use`
	   *
	   * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
	   */
	  eject(id) {
	    if (this.handlers[id]) {
	      this.handlers[id] = null;
	    }
	  }

	  /**
	   * Clear all interceptors from the stack
	   *
	   * @returns {void}
	   */
	  clear() {
	    if (this.handlers) {
	      this.handlers = [];
	    }
	  }

	  /**
	   * Iterate over all the registered interceptors
	   *
	   * This method is particularly useful for skipping over any
	   * interceptors that may have become `null` calling `eject`.
	   *
	   * @param {Function} fn The function to call for each interceptor
	   *
	   * @returns {void}
	   */
	  forEach(fn) {
	    utils.forEach(this.handlers, function forEachHandler(h) {
	      if (h !== null) {
	        fn(h);
	      }
	    });
	  }
	}

	var InterceptorManager$1 = InterceptorManager;

	var transitionalDefaults = {
	  silentJSONParsing: true,
	  forcedJSONParsing: true,
	  clarifyTimeoutError: false
	};

	var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

	var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

	var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

	/**
	 * Determine if we're running in a standard browser environment
	 *
	 * This allows axios to run in a web worker, and react-native.
	 * Both environments support XMLHttpRequest, but not fully standard globals.
	 *
	 * web workers:
	 *  typeof window -> undefined
	 *  typeof document -> undefined
	 *
	 * react-native:
	 *  navigator.product -> 'ReactNative'
	 * nativescript
	 *  navigator.product -> 'NativeScript' or 'NS'
	 *
	 * @returns {boolean}
	 */
	const isStandardBrowserEnv = (() => {
	  let product;
	  if (typeof navigator !== 'undefined' && (
	    (product = navigator.product) === 'ReactNative' ||
	    product === 'NativeScript' ||
	    product === 'NS')
	  ) {
	    return false;
	  }

	  return typeof window !== 'undefined' && typeof document !== 'undefined';
	})();

	/**
	 * Determine if we're running in a standard browser webWorker environment
	 *
	 * Although the `isStandardBrowserEnv` method indicates that
	 * `allows axios to run in a web worker`, the WebWorker will still be
	 * filtered out due to its judgment standard
	 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
	 * This leads to a problem when axios post `FormData` in webWorker
	 */
	 const isStandardBrowserWebWorkerEnv = (() => {
	  return (
	    typeof WorkerGlobalScope !== 'undefined' &&
	    // eslint-disable-next-line no-undef
	    self instanceof WorkerGlobalScope &&
	    typeof self.importScripts === 'function'
	  );
	})();


	var platform = {
	  isBrowser: true,
	  classes: {
	    URLSearchParams: URLSearchParams$1,
	    FormData: FormData$1,
	    Blob: Blob$1
	  },
	  isStandardBrowserEnv,
	  isStandardBrowserWebWorkerEnv,
	  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
	};

	function toURLEncodedForm(data, options) {
	  return toFormData(data, new platform.classes.URLSearchParams(), Object.assign({
	    visitor: function(value, key, path, helpers) {
	      if (platform.isNode && utils.isBuffer(value)) {
	        this.append(key, value.toString('base64'));
	        return false;
	      }

	      return helpers.defaultVisitor.apply(this, arguments);
	    }
	  }, options));
	}

	/**
	 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
	 *
	 * @param {string} name - The name of the property to get.
	 *
	 * @returns An array of strings.
	 */
	function parsePropPath(name) {
	  // foo[x][y][z]
	  // foo.x.y.z
	  // foo-x-y-z
	  // foo x y z
	  return utils.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
	    return match[0] === '[]' ? '' : match[1] || match[0];
	  });
	}

	/**
	 * Convert an array to an object.
	 *
	 * @param {Array<any>} arr - The array to convert to an object.
	 *
	 * @returns An object with the same keys and values as the array.
	 */
	function arrayToObject(arr) {
	  const obj = {};
	  const keys = Object.keys(arr);
	  let i;
	  const len = keys.length;
	  let key;
	  for (i = 0; i < len; i++) {
	    key = keys[i];
	    obj[key] = arr[key];
	  }
	  return obj;
	}

	/**
	 * It takes a FormData object and returns a JavaScript object
	 *
	 * @param {string} formData The FormData object to convert to JSON.
	 *
	 * @returns {Object<string, any> | null} The converted object.
	 */
	function formDataToJSON(formData) {
	  function buildPath(path, value, target, index) {
	    let name = path[index++];
	    const isNumericKey = Number.isFinite(+name);
	    const isLast = index >= path.length;
	    name = !name && utils.isArray(target) ? target.length : name;

	    if (isLast) {
	      if (utils.hasOwnProp(target, name)) {
	        target[name] = [target[name], value];
	      } else {
	        target[name] = value;
	      }

	      return !isNumericKey;
	    }

	    if (!target[name] || !utils.isObject(target[name])) {
	      target[name] = [];
	    }

	    const result = buildPath(path, value, target[name], index);

	    if (result && utils.isArray(target[name])) {
	      target[name] = arrayToObject(target[name]);
	    }

	    return !isNumericKey;
	  }

	  if (utils.isFormData(formData) && utils.isFunction(formData.entries)) {
	    const obj = {};

	    utils.forEachEntry(formData, (name, value) => {
	      buildPath(parsePropPath(name), value, obj, 0);
	    });

	    return obj;
	  }

	  return null;
	}

	/**
	 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
	 * of the input
	 *
	 * @param {any} rawValue - The value to be stringified.
	 * @param {Function} parser - A function that parses a string into a JavaScript object.
	 * @param {Function} encoder - A function that takes a value and returns a string.
	 *
	 * @returns {string} A stringified version of the rawValue.
	 */
	function stringifySafely(rawValue, parser, encoder) {
	  if (utils.isString(rawValue)) {
	    try {
	      (parser || JSON.parse)(rawValue);
	      return utils.trim(rawValue);
	    } catch (e) {
	      if (e.name !== 'SyntaxError') {
	        throw e;
	      }
	    }
	  }

	  return (encoder || JSON.stringify)(rawValue);
	}

	const defaults = {

	  transitional: transitionalDefaults,

	  adapter: platform.isNode ? 'http' : 'xhr',

	  transformRequest: [function transformRequest(data, headers) {
	    const contentType = headers.getContentType() || '';
	    const hasJSONContentType = contentType.indexOf('application/json') > -1;
	    const isObjectPayload = utils.isObject(data);

	    if (isObjectPayload && utils.isHTMLForm(data)) {
	      data = new FormData(data);
	    }

	    const isFormData = utils.isFormData(data);

	    if (isFormData) {
	      if (!hasJSONContentType) {
	        return data;
	      }
	      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
	    }

	    if (utils.isArrayBuffer(data) ||
	      utils.isBuffer(data) ||
	      utils.isStream(data) ||
	      utils.isFile(data) ||
	      utils.isBlob(data)
	    ) {
	      return data;
	    }
	    if (utils.isArrayBufferView(data)) {
	      return data.buffer;
	    }
	    if (utils.isURLSearchParams(data)) {
	      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
	      return data.toString();
	    }

	    let isFileList;

	    if (isObjectPayload) {
	      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
	        return toURLEncodedForm(data, this.formSerializer).toString();
	      }

	      if ((isFileList = utils.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
	        const _FormData = this.env && this.env.FormData;

	        return toFormData(
	          isFileList ? {'files[]': data} : data,
	          _FormData && new _FormData(),
	          this.formSerializer
	        );
	      }
	    }

	    if (isObjectPayload || hasJSONContentType ) {
	      headers.setContentType('application/json', false);
	      return stringifySafely(data);
	    }

	    return data;
	  }],

	  transformResponse: [function transformResponse(data) {
	    const transitional = this.transitional || defaults.transitional;
	    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
	    const JSONRequested = this.responseType === 'json';

	    if (data && utils.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
	      const silentJSONParsing = transitional && transitional.silentJSONParsing;
	      const strictJSONParsing = !silentJSONParsing && JSONRequested;

	      try {
	        return JSON.parse(data);
	      } catch (e) {
	        if (strictJSONParsing) {
	          if (e.name === 'SyntaxError') {
	            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
	          }
	          throw e;
	        }
	      }
	    }

	    return data;
	  }],

	  /**
	   * A timeout in milliseconds to abort a request. If set to 0 (default) a
	   * timeout is not created.
	   */
	  timeout: 0,

	  xsrfCookieName: 'XSRF-TOKEN',
	  xsrfHeaderName: 'X-XSRF-TOKEN',

	  maxContentLength: -1,
	  maxBodyLength: -1,

	  env: {
	    FormData: platform.classes.FormData,
	    Blob: platform.classes.Blob
	  },

	  validateStatus: function validateStatus(status) {
	    return status >= 200 && status < 300;
	  },

	  headers: {
	    common: {
	      'Accept': 'application/json, text/plain, */*',
	      'Content-Type': undefined
	    }
	  }
	};

	utils.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], (method) => {
	  defaults.headers[method] = {};
	});

	var defaults$1 = defaults;

	// RawAxiosHeaders whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	const ignoreDuplicateOf = utils.toObjectSet([
	  'age', 'authorization', 'content-length', 'content-type', 'etag',
	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	  'referer', 'retry-after', 'user-agent'
	]);

	/**
	 * Parse headers into an object
	 *
	 * ```
	 * Date: Wed, 27 Aug 2014 08:58:49 GMT
	 * Content-Type: application/json
	 * Connection: keep-alive
	 * Transfer-Encoding: chunked
	 * ```
	 *
	 * @param {String} rawHeaders Headers needing to be parsed
	 *
	 * @returns {Object} Headers parsed into an object
	 */
	var parseHeaders = rawHeaders => {
	  const parsed = {};
	  let key;
	  let val;
	  let i;

	  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
	    i = line.indexOf(':');
	    key = line.substring(0, i).trim().toLowerCase();
	    val = line.substring(i + 1).trim();

	    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
	      return;
	    }

	    if (key === 'set-cookie') {
	      if (parsed[key]) {
	        parsed[key].push(val);
	      } else {
	        parsed[key] = [val];
	      }
	    } else {
	      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
	    }
	  });

	  return parsed;
	};

	const $internals = Symbol('internals');

	function normalizeHeader(header) {
	  return header && String(header).trim().toLowerCase();
	}

	function normalizeValue(value) {
	  if (value === false || value == null) {
	    return value;
	  }

	  return utils.isArray(value) ? value.map(normalizeValue) : String(value);
	}

	function parseTokens(str) {
	  const tokens = Object.create(null);
	  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
	  let match;

	  while ((match = tokensRE.exec(str))) {
	    tokens[match[1]] = match[2];
	  }

	  return tokens;
	}

	const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

	function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
	  if (utils.isFunction(filter)) {
	    return filter.call(this, value, header);
	  }

	  if (isHeaderNameFilter) {
	    value = header;
	  }

	  if (!utils.isString(value)) return;

	  if (utils.isString(filter)) {
	    return value.indexOf(filter) !== -1;
	  }

	  if (utils.isRegExp(filter)) {
	    return filter.test(value);
	  }
	}

	function formatHeader(header) {
	  return header.trim()
	    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
	      return char.toUpperCase() + str;
	    });
	}

	function buildAccessors(obj, header) {
	  const accessorName = utils.toCamelCase(' ' + header);

	  ['get', 'set', 'has'].forEach(methodName => {
	    Object.defineProperty(obj, methodName + accessorName, {
	      value: function(arg1, arg2, arg3) {
	        return this[methodName].call(this, header, arg1, arg2, arg3);
	      },
	      configurable: true
	    });
	  });
	}

	class AxiosHeaders {
	  constructor(headers) {
	    headers && this.set(headers);
	  }

	  set(header, valueOrRewrite, rewrite) {
	    const self = this;

	    function setHeader(_value, _header, _rewrite) {
	      const lHeader = normalizeHeader(_header);

	      if (!lHeader) {
	        throw new Error('header name must be a non-empty string');
	      }

	      const key = utils.findKey(self, lHeader);

	      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
	        self[key || _header] = normalizeValue(_value);
	      }
	    }

	    const setHeaders = (headers, _rewrite) =>
	      utils.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

	    if (utils.isPlainObject(header) || header instanceof this.constructor) {
	      setHeaders(header, valueOrRewrite);
	    } else if(utils.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
	      setHeaders(parseHeaders(header), valueOrRewrite);
	    } else {
	      header != null && setHeader(valueOrRewrite, header, rewrite);
	    }

	    return this;
	  }

	  get(header, parser) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils.findKey(this, header);

	      if (key) {
	        const value = this[key];

	        if (!parser) {
	          return value;
	        }

	        if (parser === true) {
	          return parseTokens(value);
	        }

	        if (utils.isFunction(parser)) {
	          return parser.call(this, value, key);
	        }

	        if (utils.isRegExp(parser)) {
	          return parser.exec(value);
	        }

	        throw new TypeError('parser must be boolean|regexp|function');
	      }
	    }
	  }

	  has(header, matcher) {
	    header = normalizeHeader(header);

	    if (header) {
	      const key = utils.findKey(this, header);

	      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
	    }

	    return false;
	  }

	  delete(header, matcher) {
	    const self = this;
	    let deleted = false;

	    function deleteHeader(_header) {
	      _header = normalizeHeader(_header);

	      if (_header) {
	        const key = utils.findKey(self, _header);

	        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
	          delete self[key];

	          deleted = true;
	        }
	      }
	    }

	    if (utils.isArray(header)) {
	      header.forEach(deleteHeader);
	    } else {
	      deleteHeader(header);
	    }

	    return deleted;
	  }

	  clear(matcher) {
	    const keys = Object.keys(this);
	    let i = keys.length;
	    let deleted = false;

	    while (i--) {
	      const key = keys[i];
	      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
	        delete this[key];
	        deleted = true;
	      }
	    }

	    return deleted;
	  }

	  normalize(format) {
	    const self = this;
	    const headers = {};

	    utils.forEach(this, (value, header) => {
	      const key = utils.findKey(headers, header);

	      if (key) {
	        self[key] = normalizeValue(value);
	        delete self[header];
	        return;
	      }

	      const normalized = format ? formatHeader(header) : String(header).trim();

	      if (normalized !== header) {
	        delete self[header];
	      }

	      self[normalized] = normalizeValue(value);

	      headers[normalized] = true;
	    });

	    return this;
	  }

	  concat(...targets) {
	    return this.constructor.concat(this, ...targets);
	  }

	  toJSON(asStrings) {
	    const obj = Object.create(null);

	    utils.forEach(this, (value, header) => {
	      value != null && value !== false && (obj[header] = asStrings && utils.isArray(value) ? value.join(', ') : value);
	    });

	    return obj;
	  }

	  [Symbol.iterator]() {
	    return Object.entries(this.toJSON())[Symbol.iterator]();
	  }

	  toString() {
	    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
	  }

	  get [Symbol.toStringTag]() {
	    return 'AxiosHeaders';
	  }

	  static from(thing) {
	    return thing instanceof this ? thing : new this(thing);
	  }

	  static concat(first, ...targets) {
	    const computed = new this(first);

	    targets.forEach((target) => computed.set(target));

	    return computed;
	  }

	  static accessor(header) {
	    const internals = this[$internals] = (this[$internals] = {
	      accessors: {}
	    });

	    const accessors = internals.accessors;
	    const prototype = this.prototype;

	    function defineAccessor(_header) {
	      const lHeader = normalizeHeader(_header);

	      if (!accessors[lHeader]) {
	        buildAccessors(prototype, _header);
	        accessors[lHeader] = true;
	      }
	    }

	    utils.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

	    return this;
	  }
	}

	AxiosHeaders.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

	// reserved names hotfix
	utils.reduceDescriptors(AxiosHeaders.prototype, ({value}, key) => {
	  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
	  return {
	    get: () => value,
	    set(headerValue) {
	      this[mapped] = headerValue;
	    }
	  }
	});

	utils.freezeMethods(AxiosHeaders);

	var AxiosHeaders$1 = AxiosHeaders;

	/**
	 * Transform the data for a request or a response
	 *
	 * @param {Array|Function} fns A single function or Array of functions
	 * @param {?Object} response The response object
	 *
	 * @returns {*} The resulting transformed data
	 */
	function transformData(fns, response) {
	  const config = this || defaults$1;
	  const context = response || config;
	  const headers = AxiosHeaders$1.from(context.headers);
	  let data = context.data;

	  utils.forEach(fns, function transform(fn) {
	    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
	  });

	  headers.normalize();

	  return data;
	}

	function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	}

	/**
	 * A `CanceledError` is an object that is thrown when an operation is canceled.
	 *
	 * @param {string=} message The message.
	 * @param {Object=} config The config.
	 * @param {Object=} request The request.
	 *
	 * @returns {CanceledError} The created error.
	 */
	function CanceledError(message, config, request) {
	  // eslint-disable-next-line no-eq-null,eqeqeq
	  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED, config, request);
	  this.name = 'CanceledError';
	}

	utils.inherits(CanceledError, AxiosError, {
	  __CANCEL__: true
	});

	/**
	 * Resolve or reject a Promise based on response status.
	 *
	 * @param {Function} resolve A function that resolves the promise.
	 * @param {Function} reject A function that rejects the promise.
	 * @param {object} response The response.
	 *
	 * @returns {object} The response.
	 */
	function settle(resolve, reject, response) {
	  const validateStatus = response.config.validateStatus;
	  if (!response.status || !validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(new AxiosError(
	      'Request failed with status code ' + response.status,
	      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
	      response.config,
	      response.request,
	      response
	    ));
	  }
	}

	var cookies = platform.isStandardBrowserEnv ?

	// Standard browser envs support document.cookie
	  (function standardBrowserEnv() {
	    return {
	      write: function write(name, value, expires, path, domain, secure) {
	        const cookie = [];
	        cookie.push(name + '=' + encodeURIComponent(value));

	        if (utils.isNumber(expires)) {
	          cookie.push('expires=' + new Date(expires).toGMTString());
	        }

	        if (utils.isString(path)) {
	          cookie.push('path=' + path);
	        }

	        if (utils.isString(domain)) {
	          cookie.push('domain=' + domain);
	        }

	        if (secure === true) {
	          cookie.push('secure');
	        }

	        document.cookie = cookie.join('; ');
	      },

	      read: function read(name) {
	        const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
	        return (match ? decodeURIComponent(match[3]) : null);
	      },

	      remove: function remove(name) {
	        this.write(name, '', Date.now() - 86400000);
	      }
	    };
	  })() :

	// Non standard browser env (web workers, react-native) lack needed support.
	  (function nonStandardBrowserEnv() {
	    return {
	      write: function write() {},
	      read: function read() { return null; },
	      remove: function remove() {}
	    };
	  })();

	/**
	 * Determines whether the specified URL is absolute
	 *
	 * @param {string} url The URL to test
	 *
	 * @returns {boolean} True if the specified URL is absolute, otherwise false
	 */
	function isAbsoluteURL(url) {
	  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
	  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
	  // by any combination of letters, digits, plus, period, or hyphen.
	  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
	}

	/**
	 * Creates a new URL by combining the specified URLs
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} relativeURL The relative URL
	 *
	 * @returns {string} The combined URL
	 */
	function combineURLs(baseURL, relativeURL) {
	  return relativeURL
	    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
	    : baseURL;
	}

	/**
	 * Creates a new URL by combining the baseURL with the requestedURL,
	 * only when the requestedURL is not already an absolute URL.
	 * If the requestURL is absolute, this function returns the requestedURL untouched.
	 *
	 * @param {string} baseURL The base URL
	 * @param {string} requestedURL Absolute or relative URL to combine
	 *
	 * @returns {string} The combined full path
	 */
	function buildFullPath(baseURL, requestedURL) {
	  if (baseURL && !isAbsoluteURL(requestedURL)) {
	    return combineURLs(baseURL, requestedURL);
	  }
	  return requestedURL;
	}

	var isURLSameOrigin = platform.isStandardBrowserEnv ?

	// Standard browser envs have full support of the APIs needed to test
	// whether the request URL is of the same origin as current location.
	  (function standardBrowserEnv() {
	    const msie = /(msie|trident)/i.test(navigator.userAgent);
	    const urlParsingNode = document.createElement('a');
	    let originURL;

	    /**
	    * Parse a URL to discover it's components
	    *
	    * @param {String} url The URL to be parsed
	    * @returns {Object}
	    */
	    function resolveURL(url) {
	      let href = url;

	      if (msie) {
	        // IE needs attribute set twice to normalize properties
	        urlParsingNode.setAttribute('href', href);
	        href = urlParsingNode.href;
	      }

	      urlParsingNode.setAttribute('href', href);

	      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
	      return {
	        href: urlParsingNode.href,
	        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
	        host: urlParsingNode.host,
	        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
	        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
	        hostname: urlParsingNode.hostname,
	        port: urlParsingNode.port,
	        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
	          urlParsingNode.pathname :
	          '/' + urlParsingNode.pathname
	      };
	    }

	    originURL = resolveURL(window.location.href);

	    /**
	    * Determine if a URL shares the same origin as the current location
	    *
	    * @param {String} requestURL The URL to test
	    * @returns {boolean} True if URL shares the same origin, otherwise false
	    */
	    return function isURLSameOrigin(requestURL) {
	      const parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
	      return (parsed.protocol === originURL.protocol &&
	          parsed.host === originURL.host);
	    };
	  })() :

	  // Non standard browser envs (web workers, react-native) lack needed support.
	  (function nonStandardBrowserEnv() {
	    return function isURLSameOrigin() {
	      return true;
	    };
	  })();

	function parseProtocol(url) {
	  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
	  return match && match[1] || '';
	}

	/**
	 * Calculate data maxRate
	 * @param {Number} [samplesCount= 10]
	 * @param {Number} [min= 1000]
	 * @returns {Function}
	 */
	function speedometer(samplesCount, min) {
	  samplesCount = samplesCount || 10;
	  const bytes = new Array(samplesCount);
	  const timestamps = new Array(samplesCount);
	  let head = 0;
	  let tail = 0;
	  let firstSampleTS;

	  min = min !== undefined ? min : 1000;

	  return function push(chunkLength) {
	    const now = Date.now();

	    const startedAt = timestamps[tail];

	    if (!firstSampleTS) {
	      firstSampleTS = now;
	    }

	    bytes[head] = chunkLength;
	    timestamps[head] = now;

	    let i = tail;
	    let bytesCount = 0;

	    while (i !== head) {
	      bytesCount += bytes[i++];
	      i = i % samplesCount;
	    }

	    head = (head + 1) % samplesCount;

	    if (head === tail) {
	      tail = (tail + 1) % samplesCount;
	    }

	    if (now - firstSampleTS < min) {
	      return;
	    }

	    const passed = startedAt && now - startedAt;

	    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
	  };
	}

	function progressEventReducer(listener, isDownloadStream) {
	  let bytesNotified = 0;
	  const _speedometer = speedometer(50, 250);

	  return e => {
	    const loaded = e.loaded;
	    const total = e.lengthComputable ? e.total : undefined;
	    const progressBytes = loaded - bytesNotified;
	    const rate = _speedometer(progressBytes);
	    const inRange = loaded <= total;

	    bytesNotified = loaded;

	    const data = {
	      loaded,
	      total,
	      progress: total ? (loaded / total) : undefined,
	      bytes: progressBytes,
	      rate: rate ? rate : undefined,
	      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
	      event: e
	    };

	    data[isDownloadStream ? 'download' : 'upload'] = true;

	    listener(data);
	  };
	}

	const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

	var xhrAdapter = isXHRAdapterSupported && function (config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    let requestData = config.data;
	    const requestHeaders = AxiosHeaders$1.from(config.headers).normalize();
	    const responseType = config.responseType;
	    let onCanceled;
	    function done() {
	      if (config.cancelToken) {
	        config.cancelToken.unsubscribe(onCanceled);
	      }

	      if (config.signal) {
	        config.signal.removeEventListener('abort', onCanceled);
	      }
	    }

	    if (utils.isFormData(requestData)) {
	      if (platform.isStandardBrowserEnv || platform.isStandardBrowserWebWorkerEnv) {
	        requestHeaders.setContentType(false); // Let the browser set it
	      } else {
	        requestHeaders.setContentType('multipart/form-data;', false); // mobile/desktop app frameworks
	      }
	    }

	    let request = new XMLHttpRequest();

	    // HTTP basic authentication
	    if (config.auth) {
	      const username = config.auth.username || '';
	      const password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
	      requestHeaders.set('Authorization', 'Basic ' + btoa(username + ':' + password));
	    }

	    const fullPath = buildFullPath(config.baseURL, config.url);

	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

	    // Set the request timeout in MS
	    request.timeout = config.timeout;

	    function onloadend() {
	      if (!request) {
	        return;
	      }
	      // Prepare the response
	      const responseHeaders = AxiosHeaders$1.from(
	        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
	      );
	      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
	        request.responseText : request.response;
	      const response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config,
	        request
	      };

	      settle(function _resolve(value) {
	        resolve(value);
	        done();
	      }, function _reject(err) {
	        reject(err);
	        done();
	      }, response);

	      // Clean up request
	      request = null;
	    }

	    if ('onloadend' in request) {
	      // Use onloadend if available
	      request.onloadend = onloadend;
	    } else {
	      // Listen for ready state to emulate onloadend
	      request.onreadystatechange = function handleLoad() {
	        if (!request || request.readyState !== 4) {
	          return;
	        }

	        // The request errored out and we didn't get a response, this will be
	        // handled by onerror instead
	        // With one exception: request that using file: protocol, most browsers
	        // will return status as 0 even though it's a successful request
	        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
	          return;
	        }
	        // readystate handler is calling before onerror or ontimeout handlers,
	        // so we should call onloadend on the next 'tick'
	        setTimeout(onloadend);
	      };
	    }

	    // Handle browser request cancellation (as opposed to a manual cancellation)
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }

	      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle low level network errors
	    request.onerror = function handleError() {
	      // Real errors are hidden from us by the browser
	      // onerror should only fire if it's a network error
	      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle timeout
	    request.ontimeout = function handleTimeout() {
	      let timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
	      const transitional = config.transitional || transitionalDefaults;
	      if (config.timeoutErrorMessage) {
	        timeoutErrorMessage = config.timeoutErrorMessage;
	      }
	      reject(new AxiosError(
	        timeoutErrorMessage,
	        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
	        config,
	        request));

	      // Clean up request
	      request = null;
	    };

	    // Add xsrf header
	    // This is only done if running in a standard browser environment.
	    // Specifically not if we're in a web worker, or react-native.
	    if (platform.isStandardBrowserEnv) {
	      // Add xsrf header
	      const xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath))
	        && config.xsrfCookieName && cookies.read(config.xsrfCookieName);

	      if (xsrfValue) {
	        requestHeaders.set(config.xsrfHeaderName, xsrfValue);
	      }
	    }

	    // Remove Content-Type if data is undefined
	    requestData === undefined && requestHeaders.setContentType(null);

	    // Add headers to the request
	    if ('setRequestHeader' in request) {
	      utils.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
	        request.setRequestHeader(key, val);
	      });
	    }

	    // Add withCredentials to request if needed
	    if (!utils.isUndefined(config.withCredentials)) {
	      request.withCredentials = !!config.withCredentials;
	    }

	    // Add responseType to request if needed
	    if (responseType && responseType !== 'json') {
	      request.responseType = config.responseType;
	    }

	    // Handle progress if needed
	    if (typeof config.onDownloadProgress === 'function') {
	      request.addEventListener('progress', progressEventReducer(config.onDownloadProgress, true));
	    }

	    // Not all browsers support upload events
	    if (typeof config.onUploadProgress === 'function' && request.upload) {
	      request.upload.addEventListener('progress', progressEventReducer(config.onUploadProgress));
	    }

	    if (config.cancelToken || config.signal) {
	      // Handle cancellation
	      // eslint-disable-next-line func-names
	      onCanceled = cancel => {
	        if (!request) {
	          return;
	        }
	        reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
	        request.abort();
	        request = null;
	      };

	      config.cancelToken && config.cancelToken.subscribe(onCanceled);
	      if (config.signal) {
	        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
	      }
	    }

	    const protocol = parseProtocol(fullPath);

	    if (protocol && platform.protocols.indexOf(protocol) === -1) {
	      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
	      return;
	    }


	    // Send the request
	    request.send(requestData || null);
	  });
	};

	const knownAdapters = {
	  http: httpAdapter,
	  xhr: xhrAdapter
	};

	utils.forEach(knownAdapters, (fn, value) => {
	  if(fn) {
	    try {
	      Object.defineProperty(fn, 'name', {value});
	    } catch (e) {
	      // eslint-disable-next-line no-empty
	    }
	    Object.defineProperty(fn, 'adapterName', {value});
	  }
	});

	var adapters = {
	  getAdapter: (adapters) => {
	    adapters = utils.isArray(adapters) ? adapters : [adapters];

	    const {length} = adapters;
	    let nameOrAdapter;
	    let adapter;

	    for (let i = 0; i < length; i++) {
	      nameOrAdapter = adapters[i];
	      if((adapter = utils.isString(nameOrAdapter) ? knownAdapters[nameOrAdapter.toLowerCase()] : nameOrAdapter)) {
	        break;
	      }
	    }

	    if (!adapter) {
	      if (adapter === false) {
	        throw new AxiosError(
	          `Adapter ${nameOrAdapter} is not supported by the environment`,
	          'ERR_NOT_SUPPORT'
	        );
	      }

	      throw new Error(
	        utils.hasOwnProp(knownAdapters, nameOrAdapter) ?
	          `Adapter '${nameOrAdapter}' is not available in the build` :
	          `Unknown adapter '${nameOrAdapter}'`
	      );
	    }

	    if (!utils.isFunction(adapter)) {
	      throw new TypeError('adapter is not a function');
	    }

	    return adapter;
	  },
	  adapters: knownAdapters
	};

	/**
	 * Throws a `CanceledError` if cancellation has been requested.
	 *
	 * @param {Object} config The config that is to be used for the request
	 *
	 * @returns {void}
	 */
	function throwIfCancellationRequested(config) {
	  if (config.cancelToken) {
	    config.cancelToken.throwIfRequested();
	  }

	  if (config.signal && config.signal.aborted) {
	    throw new CanceledError(null, config);
	  }
	}

	/**
	 * Dispatch a request to the server using the configured adapter.
	 *
	 * @param {object} config The config that is to be used for the request
	 *
	 * @returns {Promise} The Promise to be fulfilled
	 */
	function dispatchRequest(config) {
	  throwIfCancellationRequested(config);

	  config.headers = AxiosHeaders$1.from(config.headers);

	  // Transform request data
	  config.data = transformData.call(
	    config,
	    config.transformRequest
	  );

	  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
	    config.headers.setContentType('application/x-www-form-urlencoded', false);
	  }

	  const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter);

	  return adapter(config).then(function onAdapterResolution(response) {
	    throwIfCancellationRequested(config);

	    // Transform response data
	    response.data = transformData.call(
	      config,
	      config.transformResponse,
	      response
	    );

	    response.headers = AxiosHeaders$1.from(response.headers);

	    return response;
	  }, function onAdapterRejection(reason) {
	    if (!isCancel(reason)) {
	      throwIfCancellationRequested(config);

	      // Transform response data
	      if (reason && reason.response) {
	        reason.response.data = transformData.call(
	          config,
	          config.transformResponse,
	          reason.response
	        );
	        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
	      }
	    }

	    return Promise.reject(reason);
	  });
	}

	const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? thing.toJSON() : thing;

	/**
	 * Config-specific merge-function which creates a new config-object
	 * by merging two configuration objects together.
	 *
	 * @param {Object} config1
	 * @param {Object} config2
	 *
	 * @returns {Object} New object resulting from merging config2 to config1
	 */
	function mergeConfig(config1, config2) {
	  // eslint-disable-next-line no-param-reassign
	  config2 = config2 || {};
	  const config = {};

	  function getMergedValue(target, source, caseless) {
	    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
	      return utils.merge.call({caseless}, target, source);
	    } else if (utils.isPlainObject(source)) {
	      return utils.merge({}, source);
	    } else if (utils.isArray(source)) {
	      return source.slice();
	    }
	    return source;
	  }

	  // eslint-disable-next-line consistent-return
	  function mergeDeepProperties(a, b, caseless) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(a, b, caseless);
	    } else if (!utils.isUndefined(a)) {
	      return getMergedValue(undefined, a, caseless);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function valueFromConfig2(a, b) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function defaultToConfig2(a, b) {
	    if (!utils.isUndefined(b)) {
	      return getMergedValue(undefined, b);
	    } else if (!utils.isUndefined(a)) {
	      return getMergedValue(undefined, a);
	    }
	  }

	  // eslint-disable-next-line consistent-return
	  function mergeDirectKeys(a, b, prop) {
	    if (prop in config2) {
	      return getMergedValue(a, b);
	    } else if (prop in config1) {
	      return getMergedValue(undefined, a);
	    }
	  }

	  const mergeMap = {
	    url: valueFromConfig2,
	    method: valueFromConfig2,
	    data: valueFromConfig2,
	    baseURL: defaultToConfig2,
	    transformRequest: defaultToConfig2,
	    transformResponse: defaultToConfig2,
	    paramsSerializer: defaultToConfig2,
	    timeout: defaultToConfig2,
	    timeoutMessage: defaultToConfig2,
	    withCredentials: defaultToConfig2,
	    adapter: defaultToConfig2,
	    responseType: defaultToConfig2,
	    xsrfCookieName: defaultToConfig2,
	    xsrfHeaderName: defaultToConfig2,
	    onUploadProgress: defaultToConfig2,
	    onDownloadProgress: defaultToConfig2,
	    decompress: defaultToConfig2,
	    maxContentLength: defaultToConfig2,
	    maxBodyLength: defaultToConfig2,
	    beforeRedirect: defaultToConfig2,
	    transport: defaultToConfig2,
	    httpAgent: defaultToConfig2,
	    httpsAgent: defaultToConfig2,
	    cancelToken: defaultToConfig2,
	    socketPath: defaultToConfig2,
	    responseEncoding: defaultToConfig2,
	    validateStatus: mergeDirectKeys,
	    headers: (a, b) => mergeDeepProperties(headersToObject(a), headersToObject(b), true)
	  };

	  utils.forEach(Object.keys(Object.assign({}, config1, config2)), function computeConfigValue(prop) {
	    const merge = mergeMap[prop] || mergeDeepProperties;
	    const configValue = merge(config1[prop], config2[prop], prop);
	    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
	  });

	  return config;
	}

	const VERSION = "1.5.0";

	const validators$1 = {};

	// eslint-disable-next-line func-names
	['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
	  validators$1[type] = function validator(thing) {
	    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
	  };
	});

	const deprecatedWarnings = {};

	/**
	 * Transitional option validator
	 *
	 * @param {function|boolean?} validator - set to false if the transitional option has been removed
	 * @param {string?} version - deprecated version / removed since version
	 * @param {string?} message - some message with additional info
	 *
	 * @returns {function}
	 */
	validators$1.transitional = function transitional(validator, version, message) {
	  function formatMessage(opt, desc) {
	    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
	  }

	  // eslint-disable-next-line func-names
	  return (value, opt, opts) => {
	    if (validator === false) {
	      throw new AxiosError(
	        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
	        AxiosError.ERR_DEPRECATED
	      );
	    }

	    if (version && !deprecatedWarnings[opt]) {
	      deprecatedWarnings[opt] = true;
	      // eslint-disable-next-line no-console
	      console.warn(
	        formatMessage(
	          opt,
	          ' has been deprecated since v' + version + ' and will be removed in the near future'
	        )
	      );
	    }

	    return validator ? validator(value, opt, opts) : true;
	  };
	};

	/**
	 * Assert object's properties type
	 *
	 * @param {object} options
	 * @param {object} schema
	 * @param {boolean?} allowUnknown
	 *
	 * @returns {object}
	 */

	function assertOptions(options, schema, allowUnknown) {
	  if (typeof options !== 'object') {
	    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
	  }
	  const keys = Object.keys(options);
	  let i = keys.length;
	  while (i-- > 0) {
	    const opt = keys[i];
	    const validator = schema[opt];
	    if (validator) {
	      const value = options[opt];
	      const result = value === undefined || validator(value, opt, options);
	      if (result !== true) {
	        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
	      }
	      continue;
	    }
	    if (allowUnknown !== true) {
	      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
	    }
	  }
	}

	var validator = {
	  assertOptions,
	  validators: validators$1
	};

	const validators = validator.validators;

	/**
	 * Create a new instance of Axios
	 *
	 * @param {Object} instanceConfig The default config for the instance
	 *
	 * @return {Axios} A new instance of Axios
	 */
	class Axios {
	  constructor(instanceConfig) {
	    this.defaults = instanceConfig;
	    this.interceptors = {
	      request: new InterceptorManager$1(),
	      response: new InterceptorManager$1()
	    };
	  }

	  /**
	   * Dispatch a request
	   *
	   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
	   * @param {?Object} config
	   *
	   * @returns {Promise} The Promise to be fulfilled
	   */
	  request(configOrUrl, config) {
	    /*eslint no-param-reassign:0*/
	    // Allow for axios('example/url'[, config]) a la fetch API
	    if (typeof configOrUrl === 'string') {
	      config = config || {};
	      config.url = configOrUrl;
	    } else {
	      config = configOrUrl || {};
	    }

	    config = mergeConfig(this.defaults, config);

	    const {transitional, paramsSerializer, headers} = config;

	    if (transitional !== undefined) {
	      validator.assertOptions(transitional, {
	        silentJSONParsing: validators.transitional(validators.boolean),
	        forcedJSONParsing: validators.transitional(validators.boolean),
	        clarifyTimeoutError: validators.transitional(validators.boolean)
	      }, false);
	    }

	    if (paramsSerializer != null) {
	      if (utils.isFunction(paramsSerializer)) {
	        config.paramsSerializer = {
	          serialize: paramsSerializer
	        };
	      } else {
	        validator.assertOptions(paramsSerializer, {
	          encode: validators.function,
	          serialize: validators.function
	        }, true);
	      }
	    }

	    // Set config.method
	    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

	    // Flatten headers
	    let contextHeaders = headers && utils.merge(
	      headers.common,
	      headers[config.method]
	    );

	    headers && utils.forEach(
	      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
	      (method) => {
	        delete headers[method];
	      }
	    );

	    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

	    // filter out skipped interceptors
	    const requestInterceptorChain = [];
	    let synchronousRequestInterceptors = true;
	    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
	      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
	        return;
	      }

	      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

	      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
	    });

	    const responseInterceptorChain = [];
	    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
	      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
	    });

	    let promise;
	    let i = 0;
	    let len;

	    if (!synchronousRequestInterceptors) {
	      const chain = [dispatchRequest.bind(this), undefined];
	      chain.unshift.apply(chain, requestInterceptorChain);
	      chain.push.apply(chain, responseInterceptorChain);
	      len = chain.length;

	      promise = Promise.resolve(config);

	      while (i < len) {
	        promise = promise.then(chain[i++], chain[i++]);
	      }

	      return promise;
	    }

	    len = requestInterceptorChain.length;

	    let newConfig = config;

	    i = 0;

	    while (i < len) {
	      const onFulfilled = requestInterceptorChain[i++];
	      const onRejected = requestInterceptorChain[i++];
	      try {
	        newConfig = onFulfilled(newConfig);
	      } catch (error) {
	        onRejected.call(this, error);
	        break;
	      }
	    }

	    try {
	      promise = dispatchRequest.call(this, newConfig);
	    } catch (error) {
	      return Promise.reject(error);
	    }

	    i = 0;
	    len = responseInterceptorChain.length;

	    while (i < len) {
	      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
	    }

	    return promise;
	  }

	  getUri(config) {
	    config = mergeConfig(this.defaults, config);
	    const fullPath = buildFullPath(config.baseURL, config.url);
	    return buildURL(fullPath, config.params, config.paramsSerializer);
	  }
	}

	// Provide aliases for supported request methods
	utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
	  /*eslint func-names:0*/
	  Axios.prototype[method] = function(url, config) {
	    return this.request(mergeConfig(config || {}, {
	      method,
	      url,
	      data: (config || {}).data
	    }));
	  };
	});

	utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
	  /*eslint func-names:0*/

	  function generateHTTPMethod(isForm) {
	    return function httpMethod(url, data, config) {
	      return this.request(mergeConfig(config || {}, {
	        method,
	        headers: isForm ? {
	          'Content-Type': 'multipart/form-data'
	        } : {},
	        url,
	        data
	      }));
	    };
	  }

	  Axios.prototype[method] = generateHTTPMethod();

	  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
	});

	var Axios$1 = Axios;

	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @param {Function} executor The executor function.
	 *
	 * @returns {CancelToken}
	 */
	class CancelToken {
	  constructor(executor) {
	    if (typeof executor !== 'function') {
	      throw new TypeError('executor must be a function.');
	    }

	    let resolvePromise;

	    this.promise = new Promise(function promiseExecutor(resolve) {
	      resolvePromise = resolve;
	    });

	    const token = this;

	    // eslint-disable-next-line func-names
	    this.promise.then(cancel => {
	      if (!token._listeners) return;

	      let i = token._listeners.length;

	      while (i-- > 0) {
	        token._listeners[i](cancel);
	      }
	      token._listeners = null;
	    });

	    // eslint-disable-next-line func-names
	    this.promise.then = onfulfilled => {
	      let _resolve;
	      // eslint-disable-next-line func-names
	      const promise = new Promise(resolve => {
	        token.subscribe(resolve);
	        _resolve = resolve;
	      }).then(onfulfilled);

	      promise.cancel = function reject() {
	        token.unsubscribe(_resolve);
	      };

	      return promise;
	    };

	    executor(function cancel(message, config, request) {
	      if (token.reason) {
	        // Cancellation has already been requested
	        return;
	      }

	      token.reason = new CanceledError(message, config, request);
	      resolvePromise(token.reason);
	    });
	  }

	  /**
	   * Throws a `CanceledError` if cancellation has been requested.
	   */
	  throwIfRequested() {
	    if (this.reason) {
	      throw this.reason;
	    }
	  }

	  /**
	   * Subscribe to the cancel signal
	   */

	  subscribe(listener) {
	    if (this.reason) {
	      listener(this.reason);
	      return;
	    }

	    if (this._listeners) {
	      this._listeners.push(listener);
	    } else {
	      this._listeners = [listener];
	    }
	  }

	  /**
	   * Unsubscribe from the cancel signal
	   */

	  unsubscribe(listener) {
	    if (!this._listeners) {
	      return;
	    }
	    const index = this._listeners.indexOf(listener);
	    if (index !== -1) {
	      this._listeners.splice(index, 1);
	    }
	  }

	  /**
	   * Returns an object that contains a new `CancelToken` and a function that, when called,
	   * cancels the `CancelToken`.
	   */
	  static source() {
	    let cancel;
	    const token = new CancelToken(function executor(c) {
	      cancel = c;
	    });
	    return {
	      token,
	      cancel
	    };
	  }
	}

	var CancelToken$1 = CancelToken;

	/**
	 * Syntactic sugar for invoking a function and expanding an array for arguments.
	 *
	 * Common use case would be to use `Function.prototype.apply`.
	 *
	 *  ```js
	 *  function f(x, y, z) {}
	 *  var args = [1, 2, 3];
	 *  f.apply(null, args);
	 *  ```
	 *
	 * With `spread` this example can be re-written.
	 *
	 *  ```js
	 *  spread(function(x, y, z) {})([1, 2, 3]);
	 *  ```
	 *
	 * @param {Function} callback
	 *
	 * @returns {Function}
	 */
	function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	}

	/**
	 * Determines whether the payload is an error thrown by Axios
	 *
	 * @param {*} payload The value to test
	 *
	 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
	 */
	function isAxiosError(payload) {
	  return utils.isObject(payload) && (payload.isAxiosError === true);
	}

	const HttpStatusCode = {
	  Continue: 100,
	  SwitchingProtocols: 101,
	  Processing: 102,
	  EarlyHints: 103,
	  Ok: 200,
	  Created: 201,
	  Accepted: 202,
	  NonAuthoritativeInformation: 203,
	  NoContent: 204,
	  ResetContent: 205,
	  PartialContent: 206,
	  MultiStatus: 207,
	  AlreadyReported: 208,
	  ImUsed: 226,
	  MultipleChoices: 300,
	  MovedPermanently: 301,
	  Found: 302,
	  SeeOther: 303,
	  NotModified: 304,
	  UseProxy: 305,
	  Unused: 306,
	  TemporaryRedirect: 307,
	  PermanentRedirect: 308,
	  BadRequest: 400,
	  Unauthorized: 401,
	  PaymentRequired: 402,
	  Forbidden: 403,
	  NotFound: 404,
	  MethodNotAllowed: 405,
	  NotAcceptable: 406,
	  ProxyAuthenticationRequired: 407,
	  RequestTimeout: 408,
	  Conflict: 409,
	  Gone: 410,
	  LengthRequired: 411,
	  PreconditionFailed: 412,
	  PayloadTooLarge: 413,
	  UriTooLong: 414,
	  UnsupportedMediaType: 415,
	  RangeNotSatisfiable: 416,
	  ExpectationFailed: 417,
	  ImATeapot: 418,
	  MisdirectedRequest: 421,
	  UnprocessableEntity: 422,
	  Locked: 423,
	  FailedDependency: 424,
	  TooEarly: 425,
	  UpgradeRequired: 426,
	  PreconditionRequired: 428,
	  TooManyRequests: 429,
	  RequestHeaderFieldsTooLarge: 431,
	  UnavailableForLegalReasons: 451,
	  InternalServerError: 500,
	  NotImplemented: 501,
	  BadGateway: 502,
	  ServiceUnavailable: 503,
	  GatewayTimeout: 504,
	  HttpVersionNotSupported: 505,
	  VariantAlsoNegotiates: 506,
	  InsufficientStorage: 507,
	  LoopDetected: 508,
	  NotExtended: 510,
	  NetworkAuthenticationRequired: 511,
	};

	Object.entries(HttpStatusCode).forEach(([key, value]) => {
	  HttpStatusCode[value] = key;
	});

	var HttpStatusCode$1 = HttpStatusCode;

	/**
	 * Create an instance of Axios
	 *
	 * @param {Object} defaultConfig The default config for the instance
	 *
	 * @returns {Axios} A new instance of Axios
	 */
	function createInstance(defaultConfig) {
	  const context = new Axios$1(defaultConfig);
	  const instance = bind(Axios$1.prototype.request, context);

	  // Copy axios.prototype to instance
	  utils.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

	  // Copy context to instance
	  utils.extend(instance, context, null, {allOwnKeys: true});

	  // Factory for creating new instances
	  instance.create = function create(instanceConfig) {
	    return createInstance(mergeConfig(defaultConfig, instanceConfig));
	  };

	  return instance;
	}

	// Create the default instance to be exported
	const axios = createInstance(defaults$1);

	// Expose Axios class to allow class inheritance
	axios.Axios = Axios$1;

	// Expose Cancel & CancelToken
	axios.CanceledError = CanceledError;
	axios.CancelToken = CancelToken$1;
	axios.isCancel = isCancel;
	axios.VERSION = VERSION;
	axios.toFormData = toFormData;

	// Expose AxiosError class
	axios.AxiosError = AxiosError;

	// alias for CanceledError for backward compatibility
	axios.Cancel = axios.CanceledError;

	// Expose all/spread
	axios.all = function all(promises) {
	  return Promise.all(promises);
	};

	axios.spread = spread;

	// Expose isAxiosError
	axios.isAxiosError = isAxiosError;

	// Expose mergeConfig
	axios.mergeConfig = mergeConfig;

	axios.AxiosHeaders = AxiosHeaders$1;

	axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

	axios.getAdapter = adapters.getAdapter;

	axios.HttpStatusCode = HttpStatusCode$1;

	axios.default = axios;

	// this module should only have a default export
	var axios$1 = axios;

	var V3_URL = 'https://js.stripe.com/v3';
	var V3_URL_REGEX = /^https:\/\/js\.stripe\.com\/v3\/?(\?.*)?$/;
	var EXISTING_SCRIPT_MESSAGE = 'loadStripe.setLoadParameters was called but an existing Stripe.js script already exists in the document; existing script parameters will be used';
	var findScript = function findScript() {
	  var scripts = document.querySelectorAll("script[src^=\"".concat(V3_URL, "\"]"));

	  for (var i = 0; i < scripts.length; i++) {
	    var script = scripts[i];

	    if (!V3_URL_REGEX.test(script.src)) {
	      continue;
	    }

	    return script;
	  }

	  return null;
	};

	var injectScript = function injectScript(params) {
	  var queryString = params && !params.advancedFraudSignals ? '?advancedFraudSignals=false' : '';
	  var script = document.createElement('script');
	  script.src = "".concat(V3_URL).concat(queryString);
	  var headOrBody = document.head || document.body;

	  if (!headOrBody) {
	    throw new Error('Expected document.body not to be null. Stripe.js requires a <body> element.');
	  }

	  headOrBody.appendChild(script);
	  return script;
	};

	var registerWrapper = function registerWrapper(stripe, startTime) {
	  if (!stripe || !stripe._registerWrapper) {
	    return;
	  }

	  stripe._registerWrapper({
	    name: 'stripe-js',
	    version: "1.54.2",
	    startTime: startTime
	  });
	};

	var stripePromise = null;
	var loadScript = function loadScript(params) {
	  // Ensure that we only attempt to load Stripe.js at most once
	  if (stripePromise !== null) {
	    return stripePromise;
	  }

	  stripePromise = new Promise(function (resolve, reject) {
	    if (typeof window === 'undefined' || typeof document === 'undefined') {
	      // Resolve to null when imported server side. This makes the module
	      // safe to import in an isomorphic code base.
	      resolve(null);
	      return;
	    }

	    if (window.Stripe && params) {
	      console.warn(EXISTING_SCRIPT_MESSAGE);
	    }

	    if (window.Stripe) {
	      resolve(window.Stripe);
	      return;
	    }

	    try {
	      var script = findScript();

	      if (script && params) {
	        console.warn(EXISTING_SCRIPT_MESSAGE);
	      } else if (!script) {
	        script = injectScript(params);
	      }

	      script.addEventListener('load', function () {
	        if (window.Stripe) {
	          resolve(window.Stripe);
	        } else {
	          reject(new Error('Stripe.js not available'));
	        }
	      });
	      script.addEventListener('error', function () {
	        reject(new Error('Failed to load Stripe.js'));
	      });
	    } catch (error) {
	      reject(error);
	      return;
	    }
	  });
	  return stripePromise;
	};
	var initStripe = function initStripe(maybeStripe, args, startTime) {
	  if (maybeStripe === null) {
	    return null;
	  }

	  var stripe = maybeStripe.apply(undefined, args);
	  registerWrapper(stripe, startTime);
	  return stripe;
	}; // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types

	// own script injection.

	var stripePromise$1 = Promise.resolve().then(function () {
	  return loadScript(null);
	});
	var loadCalled = false;
	stripePromise$1["catch"](function (err) {
	  if (!loadCalled) {
	    console.warn(err);
	  }
	});
	var loadStripe = function loadStripe() {
	  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
	    args[_key] = arguments[_key];
	  }

	  loadCalled = true;
	  var startTime = Date.now();
	  return stripePromise$1.then(function (maybeStripe) {
	    return initStripe(maybeStripe, args, startTime);
	  });
	};

	/**
	 * @param {HTMLElement} node
	 * @param {import('@stripe/stripe-js').StripeElementType} type
	 * @param {import('@stripe/stripe-js').StripeElements} elements
	 * @param {<EventKey extends string>(type: EventKey, detail?: any) => void} dispatch
	 * @param {import('@stripe/stripe-js').StripeElementsOptions} options
	 *
	 * @returns {import('@stripe/stripe-js').StripeElementBase}
	 */
	function mount(node, type, elements, dispatch, options = {}) {
	  const element = elements.create(type, options);

	  element.mount(node);
	  element.on('change', (e) => dispatch('change', e));
	  element.on('ready', (e) => dispatch('ready', e));
	  element.on('focus', (e) => dispatch('focus', e));
	  element.on('blur', (e) => dispatch('blur', e));
	  element.on('escape', (e) => dispatch('escape', e));
	  element.on('click', (e) => dispatch('click', e));

	  return element
	}

	const isServer = typeof window === 'undefined';

	/**
	 * @param {import('@stripe/stripe-js').Stripe} stripe
	 * @returns {void}
	 */
	function register(stripe) {
	  if (!isServer) {
	    return stripe.registerAppInfo({
	      name: 'svelte-stripe-js',
	      url: 'https://svelte-stripe-js.vercel.app'
	    })
	  }
	}

	/* node_modules\svelte-stripe\PaymentElement.svelte generated by Svelte v4.2.1 */

	function create_fragment$a(ctx) {
		let div;

		return {
			c() {
				div = element("div");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				/*div_binding*/ ctx[5](div);
			},
			p: noop$1,
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				/*div_binding*/ ctx[5](null);
			}
		};
	}

	function instance$a($$self, $$props, $$invalidate) {
		let element;

		/** @type {HTMLElement?} */
		let wrapper;

		const dispatch = createEventDispatcher();

		/** @type {import("./types").ElementsContext} */
		const { elements } = getContext('stripe');

		onMount(() => {
			element = mount(wrapper, 'payment', elements, dispatch);
			return () => element.destroy();
		});

		function blur() {
			element.blur();
		}

		function clear() {
			element.clear();
		}

		function destroy() {
			element.destroy();
		}

		function focus() {
			element.focus();
		}

		function div_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				wrapper = $$value;
				$$invalidate(0, wrapper);
			});
		}

		return [wrapper, blur, clear, destroy, focus, div_binding];
	}

	class PaymentElement extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$a, create_fragment$a, safe_not_equal, { blur: 1, clear: 2, destroy: 3, focus: 4 });
		}

		get blur() {
			return this.$$.ctx[1];
		}

		get clear() {
			return this.$$.ctx[2];
		}

		get destroy() {
			return this.$$.ctx[3];
		}

		get focus() {
			return this.$$.ctx[4];
		}
	}

	/* node_modules\svelte-stripe\Elements.svelte generated by Svelte v4.2.1 */

	function create_fragment$9(ctx) {
		let current;
		const default_slot_template = /*#slots*/ ctx[12].default;
		const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], null);

		return {
			c() {
				if (default_slot) default_slot.c();
			},
			m(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},
			p(ctx, [dirty]) {
				if (default_slot) {
					if (default_slot.p && (!current || dirty & /*$$scope*/ 2048)) {
						update_slot_base(
							default_slot,
							default_slot_template,
							ctx,
							/*$$scope*/ ctx[11],
							!current
							? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
							: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, null),
							null
						);
					}
				}
			},
			i(local) {
				if (current) return;
				transition_in(default_slot, local);
				current = true;
			},
			o(local) {
				transition_out(default_slot, local);
				current = false;
			},
			d(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};
	}

	function instance$9($$self, $$props, $$invalidate) {
		let appearance;
		let { $$slots: slots = {}, $$scope } = $$props;
		let { stripe } = $$props;
		let { theme = 'stripe' } = $$props;
		let { variables = {} } = $$props;
		let { rules = {} } = $$props;
		let { labels = 'above' } = $$props;
		let { loader = 'auto' } = $$props;
		let { fonts = [] } = $$props;
		let { locale = "auto" } = $$props;
		let { clientSecret = undefined } = $$props;

		let { elements = isServer
		? null
		: stripe.elements({
				appearance,
				clientSecret,
				fonts,
				loader,
				locale
			}) } = $$props;

		register(stripe);
		setContext('stripe', { stripe, elements });

		$$self.$$set = $$props => {
			if ('stripe' in $$props) $$invalidate(0, stripe = $$props.stripe);
			if ('theme' in $$props) $$invalidate(1, theme = $$props.theme);
			if ('variables' in $$props) $$invalidate(2, variables = $$props.variables);
			if ('rules' in $$props) $$invalidate(3, rules = $$props.rules);
			if ('labels' in $$props) $$invalidate(4, labels = $$props.labels);
			if ('loader' in $$props) $$invalidate(5, loader = $$props.loader);
			if ('fonts' in $$props) $$invalidate(6, fonts = $$props.fonts);
			if ('locale' in $$props) $$invalidate(7, locale = $$props.locale);
			if ('clientSecret' in $$props) $$invalidate(8, clientSecret = $$props.clientSecret);
			if ('elements' in $$props) $$invalidate(9, elements = $$props.elements);
			if ('$$scope' in $$props) $$invalidate(11, $$scope = $$props.$$scope);
		};

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*theme, variables, rules, labels*/ 30) {
				$$invalidate(10, appearance = { theme, variables, rules, labels });
			}

			if ($$self.$$.dirty & /*elements, appearance, locale*/ 1664) {
				if (elements) {
					elements.update({ appearance, locale });
				}
			}
		};

		return [
			stripe,
			theme,
			variables,
			rules,
			labels,
			loader,
			fonts,
			locale,
			clientSecret,
			elements,
			appearance,
			$$scope,
			slots
		];
	}

	class Elements extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$9, create_fragment$9, safe_not_equal, {
				stripe: 0,
				theme: 1,
				variables: 2,
				rules: 3,
				labels: 4,
				loader: 5,
				fonts: 6,
				locale: 7,
				clientSecret: 8,
				elements: 9
			});
		}
	}

	/**
	 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
	 *
	 * https://svelte.dev/docs/svelte-transition#fade
	 * @param {Element} node
	 * @param {import('./public').FadeParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
		const o = +getComputedStyle(node).opacity;
		return {
			delay,
			duration,
			easing,
			css: (t) => `opacity: ${t * o}`
		};
	}

	/* components\ui\Spinner.svelte generated by Svelte v4.2.1 */

	function add_css$3(target) {
		append_styles(target, "svelte-13z1a3r", ".wrapper.svelte-13z1a3r{display:flex;flex-direction:column;align-items:center;justify-content:center;position:absolute;left:0;right:0;top:0;bottom:0;color:#5F753D !important;background:rgba(126, 125, 125, 0.8)\r\n    }.loader.svelte-13z1a3r{margin:100px auto;font-size:25px;width:1em;height:1em;border-radius:50%;position:relative;text-indent:-9999em;animation:svelte-13z1a3r-load5 1.1s infinite ease;transform:translateZ(0)}@keyframes svelte-13z1a3r-load5{0%,100%{box-shadow:0em -2.6em 0em 0em #ffffff, 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2), 2.5em 0em 0 0em rgba(255, 255, 255, 0.2), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.2), 0em 2.5em 0 0em rgba(255, 255, 255, 0.2), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.2), -2.6em 0em 0 0em rgba(255, 255, 255, 0.5), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.7)}12.5%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.7), 1.8em -1.8em 0 0em #ffffff, 2.5em 0em 0 0em rgba(255, 255, 255, 0.2), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.2), 0em 2.5em 0 0em rgba(255, 255, 255, 0.2), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.2), -2.6em 0em 0 0em rgba(255, 255, 255, 0.2), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.5)}25%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.5), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.7), 2.5em 0em 0 0em #ffffff, 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.2), 0em 2.5em 0 0em rgba(255, 255, 255, 0.2), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.2), -2.6em 0em 0 0em rgba(255, 255, 255, 0.2), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2)}37.5%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.2), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.5), 2.5em 0em 0 0em rgba(255, 255, 255, 0.7), 1.75em 1.75em 0 0em #ffffff, 0em 2.5em 0 0em rgba(255, 255, 255, 0.2), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.2), -2.6em 0em 0 0em rgba(255, 255, 255, 0.2), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2)}50%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.2), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2), 2.5em 0em 0 0em rgba(255, 255, 255, 0.5), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.7), 0em 2.5em 0 0em #ffffff, -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.2), -2.6em 0em 0 0em rgba(255, 255, 255, 0.2), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2)}62.5%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.2), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2), 2.5em 0em 0 0em rgba(255, 255, 255, 0.2), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.5), 0em 2.5em 0 0em rgba(255, 255, 255, 0.7), -1.8em 1.8em 0 0em #ffffff, -2.6em 0em 0 0em rgba(255, 255, 255, 0.2), -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2)}75%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.2), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2), 2.5em 0em 0 0em rgba(255, 255, 255, 0.2), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.2), 0em 2.5em 0 0em rgba(255, 255, 255, 0.5), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.7), -2.6em 0em 0 0em #ffffff, -1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2)}87.5%{box-shadow:0em -2.6em 0em 0em rgba(255, 255, 255, 0.2), 1.8em -1.8em 0 0em rgba(255, 255, 255, 0.2), 2.5em 0em 0 0em rgba(255, 255, 255, 0.2), 1.75em 1.75em 0 0em rgba(255, 255, 255, 0.2), 0em 2.5em 0 0em rgba(255, 255, 255, 0.2), -1.8em 1.8em 0 0em rgba(255, 255, 255, 0.5), -2.6em 0em 0 0em rgba(255, 255, 255, 0.7), -1.8em -1.8em 0 0em #ffffff}}");
	}

	function create_fragment$8(ctx) {
		let div1;
		let h1;
		let span;
		let t0;
		let t1;
		let div0;
		let div1_transition;
		let current;

		return {
			c() {
				div1 = element("div");
				h1 = element("h1");
				span = element("span");
				t0 = text(/*caption*/ ctx[0]);
				t1 = space();
				div0 = element("div");
				attr(span, "class", "text-3xl");
				attr(div0, "class", "loader svelte-13z1a3r");
				attr(div1, "class", "wrapper svelte-13z1a3r");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, h1);
				append(h1, span);
				append(span, t0);
				append(h1, t1);
				append(h1, div0);
				current = true;
			},
			p(ctx, [dirty]) {
				if (!current || dirty & /*caption*/ 1) set_data(t0, /*caption*/ ctx[0]);
			},
			i(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, true);
						div1_transition.run(1);
					});
				}

				current = true;
			},
			o(local) {
				if (local) {
					if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, false);
					div1_transition.run(0);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if (detaching && div1_transition) div1_transition.end();
			}
		};
	}

	function instance$8($$self, $$props, $$invalidate) {
		let { caption } = $$props;

		$$self.$$set = $$props => {
			if ('caption' in $$props) $$invalidate(0, caption = $$props.caption);
		};

		return [caption];
	}

	class Spinner extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$8, create_fragment$8, safe_not_equal, { caption: 0 }, add_css$3);
		}
	}

	/* components\PaymentForm.svelte generated by Svelte v4.2.1 */

	function create_catch_block(ctx) {
		let p;

		return {
			c() {
				p = element("p");
				p.textContent = `Error: ${/*error*/ ctx[16].message}`;
			},
			m(target, anchor) {
				insert(target, p, anchor);
			},
			p: noop$1,
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(p);
				}
			}
		};
	}

	// (128:4) {:then data}
	function create_then_block(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block_1$3, create_else_block$2];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*stripe*/ ctx[3] && /*clientSecret*/ ctx[5]) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};
	}

	// (159:8) {:else}
	function create_else_block$2(ctx) {
		let spinner;
		let current;

		spinner = new Spinner({
				props: {
					caption: "Processing your payment, please wait..."
				}
			});

		return {
			c() {
				create_component(spinner.$$.fragment);
			},
			m(target, anchor) {
				mount_component(spinner, target, anchor);
				current = true;
			},
			p: noop$1,
			i(local) {
				if (current) return;
				transition_in(spinner.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(spinner.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(spinner, detaching);
			}
		};
	}

	// (129:8) {#if stripe && clientSecret}
	function create_if_block_1$3(ctx) {
		let div;
		let elements_1;
		let updating_elements;
		let current;

		function elements_1_elements_binding(value) {
			/*elements_1_elements_binding*/ ctx[10](value);
		}

		let elements_1_props = {
			stripe: /*stripe*/ ctx[3],
			clientSecret: /*clientSecret*/ ctx[5],
			locale: /*$userForm*/ ctx[8].country.toLocaleLowerCase() == "de"
			? "de"
			: "en",
			$$slots: { default: [create_default_slot] },
			$$scope: { ctx }
		};

		if (/*elements*/ ctx[4] !== void 0) {
			elements_1_props.elements = /*elements*/ ctx[4];
		}

		elements_1 = new Elements({ props: elements_1_props });
		binding_callbacks.push(() => bind$1(elements_1, 'elements', elements_1_elements_binding));

		return {
			c() {
				div = element("div");
				create_component(elements_1.$$.fragment);
				attr(div, "class", "flex flex-col text-center justify-between mx-auto");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				mount_component(elements_1, div, null);
				current = true;
			},
			p(ctx, dirty) {
				const elements_1_changes = {};
				if (dirty & /*stripe*/ 8) elements_1_changes.stripe = /*stripe*/ ctx[3];
				if (dirty & /*clientSecret*/ 32) elements_1_changes.clientSecret = /*clientSecret*/ ctx[5];

				if (dirty & /*$userForm*/ 256) elements_1_changes.locale = /*$userForm*/ ctx[8].country.toLocaleLowerCase() == "de"
				? "de"
				: "en";

				if (dirty & /*$$scope, isProcessing, handleStepProgress*/ 131137) {
					elements_1_changes.$$scope = { dirty, ctx };
				}

				if (!updating_elements && dirty & /*elements*/ 16) {
					updating_elements = true;
					elements_1_changes.elements = /*elements*/ ctx[4];
					add_flush_callback(() => updating_elements = false);
				}

				elements_1.$set(elements_1_changes);
			},
			i(local) {
				if (current) return;
				transition_in(elements_1.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(elements_1.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_component(elements_1);
			}
		};
	}

	// (133:16) <Elements                       {stripe}                       {clientSecret}                      locale={$userForm.country.toLocaleLowerCase() == "de" ? "de" : "en"}                      bind:elements                  >
	function create_default_slot(ctx) {
		let paymentelement;
		let t0;
		let div1;
		let button0;
		let t2;
		let div0;
		let button1;
		let t3;
		let button1_disabled_value;
		let current;
		let mounted;
		let dispose;
		paymentelement = new PaymentElement({});

		return {
			c() {
				create_component(paymentelement.$$.fragment);
				t0 = space();
				div1 = element("div");
				button0 = element("button");
				button0.textContent = "Back";
				t2 = space();
				div0 = element("div");
				button1 = element("button");
				t3 = text("Pay");
				attr(button0, "class", "text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l");
				attr(button1, "class", "bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-16 border rounded-full");
				button1.disabled = button1_disabled_value = /*isProcessing*/ ctx[6] == true;
				attr(div0, "class", "step-button");
				attr(div1, "class", "flex justify-between pt-4 pb-4 mb-8");
			},
			m(target, anchor) {
				mount_component(paymentelement, target, anchor);
				insert(target, t0, anchor);
				insert(target, div1, anchor);
				append(div1, button0);
				append(div1, t2);
				append(div1, div0);
				append(div0, button1);
				append(button1, t3);
				current = true;

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[9]),
						listen(button1, "click", /*processPayment*/ ctx[2])
					];

					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (!current || dirty & /*isProcessing*/ 64 && button1_disabled_value !== (button1_disabled_value = /*isProcessing*/ ctx[6] == true)) {
					button1.disabled = button1_disabled_value;
				}
			},
			i(local) {
				if (current) return;
				transition_in(paymentelement.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(paymentelement.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(div1);
				}

				destroy_component(paymentelement, detaching);
				mounted = false;
				run_all(dispose);
			}
		};
	}

	// (124:32)           {#if hasError == false}
	function create_pending_block(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*hasError*/ ctx[7] == false && create_if_block$4();

		return {
			c() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},
			p(ctx, dirty) {
				if (/*hasError*/ ctx[7] == false) {
					if (if_block) {
						if (dirty & /*hasError*/ 128) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$4();
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};
	}

	// (125:8) {#if hasError == false}
	function create_if_block$4(ctx) {
		let spinner;
		let current;
		spinner = new Spinner({ props: { caption: "Please wait..." } });

		return {
			c() {
				create_component(spinner.$$.fragment);
			},
			m(target, anchor) {
				mount_component(spinner, target, anchor);
				current = true;
			},
			i(local) {
				if (current) return;
				transition_in(spinner.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(spinner.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(spinner, detaching);
			}
		};
	}

	function create_fragment$7(ctx) {
		let div;
		let current;

		let info = {
			ctx,
			current: null,
			token: null,
			hasCatch: true,
			pending: create_pending_block,
			then: create_then_block,
			catch: create_catch_block,
			value: 15,
			error: 16,
			blocks: [,,,]
		};

		handle_promise(/*getPaymentIntent*/ ctx[1](), info);

		return {
			c() {
				div = element("div");
				info.block.c();
				attr(div, "id", "payment-element-container");
				attr(div, "class", "text-center py-4 h-auto");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				info.block.m(div, info.anchor = null);
				info.mount = () => div;
				info.anchor = null;
				current = true;
			},
			p(new_ctx, [dirty]) {
				ctx = new_ctx;
				update_await_block_branch(info, ctx, dirty);
			},
			i(local) {
				if (current) return;
				transition_in(info.block);
				current = true;
			},
			o(local) {
				for (let i = 0; i < 3; i += 1) {
					const block = info.blocks[i];
					transition_out(block);
				}

				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				info.block.d();
				info.token = null;
				info = null;
			}
		};
	}

	function instance$7($$self, $$props, $$invalidate) {
		let $stripePaymentIntentId;
		let $userForm;
		let $contributionValue;
		component_subscribe($$self, stripePaymentIntentId, $$value => $$invalidate(11, $stripePaymentIntentId = $$value));
		component_subscribe($$self, userForm, $$value => $$invalidate(8, $userForm = $$value));
		component_subscribe($$self, contributionValue, $$value => $$invalidate(12, $contributionValue = $$value));
		let { handleStepProgress } = $$props;
		const { STRIPE_PUBLIC_KEY, API_END_POINT } = {"STRIPE_PUBLIC_KEY":"pk_test_51NmaK6GDeLz4avmcGmICWbBO8bmfhU0sVwzkapUunLTwvb9PkwHjtvOEt3huaAihJKsgvaO4kn8PBWCLC4kVeCl500bQHd3HET","STRIPE_SECRET_KEY":"sk_test_51NmaK6GDeLz4avmc0JwGbxMQ0BReyGLQSbmtPEqnpRT3mMyCvYnPp1Jk0DXuWeOGHj6BvxUg1HgJUFS8670I16d2007ddRrKBm","API_END_POINT":"https://certificate.growmytree.com"};
		let stripe = null;

		// Stripe Elements instance
		let elements;

		let clientSecret = null;
		let isProcessing = false;
		let hasError = false;

		onMount(async () => {
			$$invalidate(3, stripe = await loadStripe(STRIPE_PUBLIC_KEY));
		});

		const getPaymentIntent = async () => {
			//If once off, create customer and proceed as it is an pass some customer info if applicable 
			//If monthly processed like this:
			//1. Create customer
			//2. Create subscription [map subscription with numbers of trees] and return payment intent (from subscription)
			//3. processed with payment. If success continue, if status requires_payment_method, represent form, else error
			let numberOfTrees = $contributionValue;

			let paymentFrequency = $userForm.contributionFrequency; //once or monthly
			let userDetails = $userForm;

			// let userLocale              = $locale;
			let userLocale = "de"; //default, testing

			let paymentIntentId = $stripePaymentIntentId;

			const axiosConfig = {
				headers: { 'Content-Type': 'application/json' }
			};

			await axios$1.post(
				API_END_POINT + '/api/create-payment-intent',
				{
					quantity: numberOfTrees,
					frequency: paymentFrequency,
					customer: userDetails,
					locale: userLocale,
					paymentIntentId
				},
				axiosConfig
			).then(function (response) {
				if (response.data.client_secret) {
					$$invalidate(5, clientSecret = response.data.client_secret); //set it to the store so that back navigation will work or so
					stripeClientSecret.set(response.data.client_secret);
					stripePaymentIntentId.set(response.data.id);
				} // processingPayment.set( true ); //to disable next buttons or so
			}).catch(function (error) {
				$$invalidate(7, hasError = true);
				console.log(error.response.data);

				Swal.fire({
					icon: 'error',
					title: 'Oops...',
					text: error.response.data.message
				});

				return false;
			});
		};

		const processPayment = async () => {
			$$invalidate(6, isProcessing = true);

			const result = await stripe.confirmPayment({
				elements,
				// specify redirect: 'if_required' or a `return_url`
				redirect: 'if_required'
			});

			if (result.error) {
				$$invalidate(6, isProcessing = false);

				Swal.fire({
					icon: 'error',
					title: 'Oh no, we have an error processing your payment',
					text: result.error.message
				});

				return false;
			}

			if (result.paymentIntent.status == "succeeded") {
				//if okay then we redirect to page or update a variable [see clientSecret]
				//redirect to thank you page, update steps here
				//redirect to home page, load a thank you component witch will contains everything related to download certificate etc.
				//Update some stats
				//successfullPayment.set( true ); //use this to decide what to show and what to do
				successPayment.set(true); //update payment success

				Swal.fire({
					title: "Thank you for your impact purchase!",
					width: 600,
					padding: '3em',
					color: '#000',
					background: '#fff url(/images/trees.png)',
					backdrop: `
                    rgba(0,0,0,0.4)
                    left top
                    no-repeat
                `
				}).then(function () {
					handleStepProgress(+1); //move to next step [thank you step]
				});
			}
		};

		const click_handler = () => handleStepProgress(-1);

		function elements_1_elements_binding(value) {
			elements = value;
			$$invalidate(4, elements);
		}

		$$self.$$set = $$props => {
			if ('handleStepProgress' in $$props) $$invalidate(0, handleStepProgress = $$props.handleStepProgress);
		};

		return [
			handleStepProgress,
			getPaymentIntent,
			processPayment,
			stripe,
			elements,
			clientSecret,
			isProcessing,
			hasError,
			$userForm,
			click_handler,
			elements_1_elements_binding
		];
	}

	class PaymentForm extends SvelteComponent {
		constructor(options) {
			super();

			init(this, options, instance$7, create_fragment$7, safe_not_equal, {
				handleStepProgress: 0,
				getPaymentIntent: 1,
				processPayment: 2
			});
		}

		get getPaymentIntent() {
			return this.$$.ctx[1];
		}

		get processPayment() {
			return this.$$.ctx[2];
		}
	}

	/* components\ThankyouForm.svelte generated by Svelte v4.2.1 */

	function create_fragment$6(ctx) {
		let div;
		let h1;
		let span0;
		let t1;
		let t2_value = /*$userForm*/ ctx[1].firstName + "";
		let t2;
		let t3;
		let t4_value = /*$userForm*/ ctx[1].lastName + "";
		let t4;
		let t5;
		let t6;
		let p;
		let t8;
		let a;
		let span1;

		return {
			c() {
				div = element("div");
				h1 = element("h1");
				span0 = element("span");
				span0.textContent = "Thank you";
				t1 = space();
				t2 = text(t2_value);
				t3 = space();
				t4 = text(t4_value);
				t5 = text("!");
				t6 = space();
				p = element("p");
				p.textContent = "Check your email soon for your personalized certificate. Can't wait? Download instantly.";
				t8 = space();
				a = element("a");
				span1 = element("span");
				span1.textContent = "Download Certificate";
				attr(span0, "id", "thank-you-span");
				attr(h1, "class", "mt-4 text-teal-900 font-semibold");
				attr(p, "class", "text-sm text-bold mt-4 mb-8");
				attr(p, "id", "check-email-msg");
				attr(span1, "id", "download-certificate");
				attr(a, "class", "mt-4 mt-4 bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-full");
				attr(a, "href", /*certificateUrl*/ ctx[0]);
				attr(a, "target", "_blank");
				attr(div, "class", "bg-white px-8 pt-6 pb-8 mb-4 text-center");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, h1);
				append(h1, span0);
				append(h1, t1);
				append(h1, t2);
				append(h1, t3);
				append(h1, t4);
				append(h1, t5);
				append(div, t6);
				append(div, p);
				append(div, t8);
				append(div, a);
				append(a, span1);
			},
			p(ctx, [dirty]) {
				if (dirty & /*$userForm*/ 2 && t2_value !== (t2_value = /*$userForm*/ ctx[1].firstName + "")) set_data(t2, t2_value);
				if (dirty & /*$userForm*/ 2 && t4_value !== (t4_value = /*$userForm*/ ctx[1].lastName + "")) set_data(t4, t4_value);

				if (dirty & /*certificateUrl*/ 1) {
					attr(a, "href", /*certificateUrl*/ ctx[0]);
				}
			},
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function instance$6($$self, $$props, $$invalidate) {
		let $userForm;
		let $contributionValue;
		component_subscribe($$self, userForm, $$value => $$invalidate(1, $userForm = $$value));
		component_subscribe($$self, contributionValue, $$value => $$invalidate(2, $contributionValue = $$value));
		let certificateUrl;
		const { API_END_POINT } = {"STRIPE_PUBLIC_KEY":"pk_test_51NmaK6GDeLz4avmcGmICWbBO8bmfhU0sVwzkapUunLTwvb9PkwHjtvOEt3huaAihJKsgvaO4kn8PBWCLC4kVeCl500bQHd3HET","STRIPE_SECRET_KEY":"sk_test_51NmaK6GDeLz4avmc0JwGbxMQ0BReyGLQSbmtPEqnpRT3mMyCvYnPp1Jk0DXuWeOGHj6BvxUg1HgJUFS8670I16d2007ddRrKBm","API_END_POINT":"https://certificate.growmytree.com"};

		onMount(() => {
			getCertificate();
		});

		const getCertificate = () => {
			const certificateRequest = {
				customer_email: 'marcel.spitzner@growmytree.com', //testing
				customer_alias: "IH-Booster Customer",
				product_units: $contributionValue,
				first_name: $userForm.firstName,
				last_name: $userForm.lastName,
				recipient_email: $userForm.email,
				template: "tree-gmt-v2",
				order_number: "2023-09-23",
				email_language: "de"
			};

			const axiosConfig = {
				headers: { 'Content-Type': 'application/json' }
			};

			axios$1.post(API_END_POINT + '/api/redeem-certificate', certificateRequest, axiosConfig).then(function (response) {
				console.log(response);
				$$invalidate(0, certificateUrl = response.data.de_certificate);
			}).catch(function (error) {
				console.log(error);
			});
		};

		return [certificateUrl, $userForm];
	}

	class ThankyouForm extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
		}
	}

	// Firefox lacks support for scrollIntoViewIfNeeded (https://caniuse.com/scrollintoviewifneeded).
	// See https://github.com/janosh/svelte-multiselect/issues/87
	// Polyfill copied from
	// https://github.com/nuxodin/lazyfill/blob/a8e63/polyfills/Element/prototype/scrollIntoViewIfNeeded.js
	// exported for testing
	function scroll_into_view_if_needed_polyfill(centerIfNeeded = true) {
	    const elem = this;
	    const observer = new IntersectionObserver(function ([entry]) {
	        const ratio = entry.intersectionRatio;
	        if (ratio < 1) {
	            const place = ratio <= 0 && centerIfNeeded ? `center` : `nearest`;
	            elem.scrollIntoView({
	                block: place,
	                inline: place,
	            });
	        }
	        this.disconnect();
	    });
	    observer.observe(elem);
	    return observer; // return for testing
	}
	if (typeof Element !== `undefined` &&
	    !Element.prototype?.scrollIntoViewIfNeeded &&
	    typeof IntersectionObserver !== `undefined`) {
	    Element.prototype.scrollIntoViewIfNeeded = scroll_into_view_if_needed_polyfill;
	}

	/* components\form\InputField.svelte generated by Svelte v4.2.1 */

	function create_fragment$5(ctx) {
		let div;
		let input;
		let mounted;
		let dispose;

		return {
			c() {
				div = element("div");
				input = element("input");
				attr(input, "type", "text");
				attr(input, "class", "w-full px-4 py-2 font-semibold text-sm border border-[#EFE3DE] rounded-md focus:border-[#EFE3DE] focus:outline-none focus:ring-1 focus:ring-[#EFE3DE] placeholder-[#EFE3DE]");
				attr(input, "placeholder", /*label*/ ctx[1]);
				attr(div, "class", "mt-2");
			},
			m(target, anchor) {
				insert(target, div, anchor);
				append(div, input);
				set_input_value(input, /*value*/ ctx[0]);

				if (!mounted) {
					dispose = [
						action_destroyer(/*typeAction*/ ctx[2].call(null, input)),
						listen(input, "input", /*input_input_handler*/ ctx[4])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*label*/ 2) {
					attr(input, "placeholder", /*label*/ ctx[1]);
				}

				if (dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0]) {
					set_input_value(input, /*value*/ ctx[0]);
				}
			},
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(div);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { value, label, type = 'text' } = $$props;

		const typeAction = node => {
			node.type = type;
		};

		function input_input_handler() {
			value = this.value;
			$$invalidate(0, value);
		}

		$$self.$$set = $$props => {
			if ('value' in $$props) $$invalidate(0, value = $$props.value);
			if ('label' in $$props) $$invalidate(1, label = $$props.label);
			if ('type' in $$props) $$invalidate(3, type = $$props.type);
		};

		return [value, label, typeAction, type, input_input_handler];
	}

	class InputField extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { value: 0, label: 1, type: 3 });
		}
	}

	/* components\form\Switch.svelte generated by Svelte v4.2.1 */

	function add_css$2(target) {
		append_styles(target, "svelte-wscrds", ".active.svelte-wscrds{background-color:#5F753D;color:#FFFFFF !important}");
	}

	function create_fragment$4(ctx) {
		let div2;
		let div1;
		let button0;
		let t0;
		let t1;
		let div0;
		let button1;
		let t2;
		let t3;
		let span;
		let t4;
		let mounted;
		let dispose;

		return {
			c() {
				div2 = element("div");
				div1 = element("div");
				button0 = element("button");
				t0 = text(/*labelOnce*/ ctx[0]);
				t1 = space();
				div0 = element("div");
				button1 = element("button");
				t2 = text(/*labelMonthly*/ ctx[1]);
				t3 = space();
				span = element("span");
				t4 = text(/*saveLabel*/ ctx[2]);
				attr(button0, "class", "w-1/2 px-2 sm:px-4 md:px-8 py-2 rounded-[50px] text-[#5F753D] text-xs md:text-lg font-medium svelte-wscrds");
				toggle_class(button0, "active", /*$userForm*/ ctx[3].contributionFrequency === "Once");
				attr(button1, "class", "w-full px-2 sm:px-4 md:px-8 py-2 rounded-[50px] text-xs md:text-lg font-medium svelte-wscrds");
				attr(button1, "data-tooltip-target", "tooltip-dark");
				toggle_class(button1, "active", /*$userForm*/ ctx[3].contributionFrequency === "Monthly");
				attr(span, "class", "absolute bg-[#DEE37D] text-black rounded-2xl text-xs px-1 md:px-4 py-1 top-[25px] md:top-10 right-4 md:right-10");
				attr(div0, "class", "group relative w-1/2");
				attr(div1, "class", "flex align-items-center justify-between text-[#5F753D] bg-[#F5F2F0] gap-2 px-1 py-1 space-x4 rounded-[50px]");
				attr(div2, "class", "md:px-4 w-full");
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, button0);
				append(button0, t0);
				append(div1, t1);
				append(div1, div0);
				append(div0, button1);
				append(button1, t2);
				append(div0, t3);
				append(div0, span);
				append(span, t4);

				if (!mounted) {
					dispose = [
						listen(button0, "click", /*click_handler*/ ctx[4]),
						listen(button1, "click", /*click_handler_1*/ ctx[5])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				if (dirty & /*labelOnce*/ 1) set_data(t0, /*labelOnce*/ ctx[0]);

				if (dirty & /*$userForm*/ 8) {
					toggle_class(button0, "active", /*$userForm*/ ctx[3].contributionFrequency === "Once");
				}

				if (dirty & /*labelMonthly*/ 2) set_data(t2, /*labelMonthly*/ ctx[1]);

				if (dirty & /*$userForm*/ 8) {
					toggle_class(button1, "active", /*$userForm*/ ctx[3].contributionFrequency === "Monthly");
				}

				if (dirty & /*saveLabel*/ 4) set_data(t4, /*saveLabel*/ ctx[2]);
			},
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(div2);
				}

				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let $userForm;
		component_subscribe($$self, userForm, $$value => $$invalidate(3, $userForm = $$value));
		let { labelOnce } = $$props;
		let { labelMonthly } = $$props;
		let { saveLabel } = $$props;
		const click_handler = () => set_store_value(userForm, $userForm.contributionFrequency = "Once", $userForm);
		const click_handler_1 = () => set_store_value(userForm, $userForm.contributionFrequency = "Monthly", $userForm);

		$$self.$$set = $$props => {
			if ('labelOnce' in $$props) $$invalidate(0, labelOnce = $$props.labelOnce);
			if ('labelMonthly' in $$props) $$invalidate(1, labelMonthly = $$props.labelMonthly);
			if ('saveLabel' in $$props) $$invalidate(2, saveLabel = $$props.saveLabel);
		};

		return [labelOnce, labelMonthly, saveLabel, $userForm, click_handler, click_handler_1];
	}

	class Switch extends SvelteComponent {
		constructor(options) {
			super();

			init(
				this,
				options,
				instance$4,
				create_fragment$4,
				safe_not_equal,
				{
					labelOnce: 0,
					labelMonthly: 1,
					saveLabel: 2
				},
				add_css$2
			);
		}
	}

	/* components\PricingTips.svelte generated by Svelte v4.2.1 */

	function add_css$1(target) {
		append_styles(target, "svelte-14bbl8y", ".tool_tip.svelte-14bbl8y::after{content:\" \";position:absolute;top:100%;left:50%;margin-left:-5px;border-width:5px;border-style:solid;border-color:#5F753D transparent transparent transparent}");
	}

	// (25:0) {:else}
	function create_else_block$1(ctx) {
		let div1;

		return {
			c() {
				div1 = element("div");

				div1.innerHTML = `<div class="tool_tip flex w-max rounded border border-[#5F753D] border-solid bg-white text-[#5F753D] px-1 md:px-2 py-1 font-medium shadow-2xl svelte-14bbl8y"><span class="svelte-14bbl8y pointer-events-none py-1 text-left text-[10px] font-medium md:px-2 md:text-[10px]">• One-time contribution to sustainability projects<br/>
                • Receive your Impact Certificate via email<br/></span></div>`;

				attr(div1, "class", "flex items-center justify-center px-4 py-4");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}
			}
		};
	}

	// (5:0) {#if $userForm.contributionFrequency == "Monthly"}
	function create_if_block$3(ctx) {
		let div1;

		return {
			c() {
				div1 = element("div");

				div1.innerHTML = `<div class="tool_tip flex w-max rounded bg-[#5F753D] text-white px-1 md:px-2 py-1 text-[8px] md:text-[9px] font-medium shadow-2xl svelte-14bbl8y"><span class="svelte-14bbl8y pointer-events-none py-1 text-left text-[10px] font-medium text-white shadow-2xl md:px-2 md:text-[10px]">• Ongoing contribution to sustainability projects<br/>
                • Cancel subscription anytime, no fees<br/>
                • Enjoy 15% off regular rates</span></div>`;

				attr(div1, "class", "flex items-center justify-center px-4 py-4");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}
			}
		};
	}

	function create_fragment$3(ctx) {
		let if_block_anchor;

		function select_block_type(ctx, dirty) {
			if (/*$userForm*/ ctx[0].contributionFrequency == "Monthly") return create_if_block$3;
			return create_else_block$1;
		}

		let current_block_type = select_block_type(ctx);
		let if_block = current_block_type(ctx);

		return {
			c() {
				if_block.c();
				if_block_anchor = empty();
			},
			m(target, anchor) {
				if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
			},
			p(ctx, [dirty]) {
				if (current_block_type !== (current_block_type = select_block_type(ctx))) {
					if_block.d(1);
					if_block = current_block_type(ctx);

					if (if_block) {
						if_block.c();
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				}
			},
			i: noop$1,
			o: noop$1,
			d(detaching) {
				if (detaching) {
					detach(if_block_anchor);
				}

				if_block.d(detaching);
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let $userForm;
		component_subscribe($$self, userForm, $$value => $$invalidate(0, $userForm = $$value));
		return [$userForm];
	}

	class PricingTips extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$3, create_fragment$3, safe_not_equal, {}, add_css$1);
		}
	}

	/* components\UserDetailsForm.svelte generated by Svelte v4.2.1 */

	function create_if_block_2(ctx) {
		let span;
		let t_1_value = /*$formErrors*/ ctx[4].firstName + "";
		let t_1;

		return {
			c() {
				span = element("span");
				t_1 = text(t_1_value);
				attr(span, "id", "firstNameError");
				attr(span, "class", "text-red-500 text-[11px] text-left");
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t_1);
			},
			p(ctx, dirty) {
				if (dirty & /*$formErrors*/ 16 && t_1_value !== (t_1_value = /*$formErrors*/ ctx[4].firstName + "")) set_data(t_1, t_1_value);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (87:8) {#if $formErrors.lastName != ""}
	function create_if_block_1$2(ctx) {
		let span;
		let t_1_value = /*$formErrors*/ ctx[4].lastName + "";
		let t_1;

		return {
			c() {
				span = element("span");
				t_1 = text(t_1_value);
				attr(span, "id", "lastNameError");
				attr(span, "class", "text-red-500 text-[11px] text-left");
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t_1);
			},
			p(ctx, dirty) {
				if (dirty & /*$formErrors*/ 16 && t_1_value !== (t_1_value = /*$formErrors*/ ctx[4].lastName + "")) set_data(t_1, t_1_value);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	// (94:4) {#if $formErrors.email != ""}
	function create_if_block$2(ctx) {
		let span;
		let t_1_value = /*$formErrors*/ ctx[4].email + "";
		let t_1;

		return {
			c() {
				span = element("span");
				t_1 = text(t_1_value);
				attr(span, "id", "emailError");
				attr(span, "class", "text-red-500 text-[11px] text-left");
			},
			m(target, anchor) {
				insert(target, span, anchor);
				append(span, t_1);
			},
			p(ctx, dirty) {
				if (dirty & /*$formErrors*/ 16 && t_1_value !== (t_1_value = /*$formErrors*/ ctx[4].email + "")) set_data(t_1, t_1_value);
			},
			d(detaching) {
				if (detaching) {
					detach(span);
				}
			}
		};
	}

	function create_fragment$2(ctx) {
		let div2;
		let div0;
		let switch_1;
		let updating_value;
		let t0;
		let div1;
		let pricingtips;
		let t1;
		let div15;
		let p;
		let t3;
		let div14;
		let div12;
		let div11;
		let div4;
		let label0;
		let input0;
		let input0_checked_value;
		let t4;
		let div3;
		let t6;
		let div6;
		let label1;
		let input1;
		let input1_checked_value;
		let t7;
		let div5;
		let t9;
		let div8;
		let label2;
		let input2;
		let input2_checked_value;
		let t10;
		let div7;
		let t12;
		let div10;
		let label3;
		let input3;
		let input3_checked_value;
		let t13;
		let div9;
		let t15;
		let div13;
		let span;
		let t16;
		let t17;
		let t18;
		let div18;
		let div16;
		let inputfield0;
		let updating_value_1;
		let t19;
		let t20;
		let div17;
		let inputfield1;
		let updating_value_2;
		let t21;
		let t22;
		let div19;
		let inputfield2;
		let updating_value_3;
		let t23;
		let t24;
		let inputfield3;
		let updating_value_4;
		let t25;
		let div22;
		let div20;
		let inputfield4;
		let updating_value_5;
		let t26;
		let div21;
		let inputfield5;
		let updating_value_6;
		let current;
		let binding_group;
		let mounted;
		let dispose;

		function switch_1_value_binding(value) {
			/*switch_1_value_binding*/ ctx[6](value);
		}

		let switch_1_props = {
			label: "",
			labelOnce: "Plant Once",
			labelMonthly: "Plant Monthly",
			saveLabel: "Save 15%",
			design: "inner"
		};

		if (/*$userForm*/ ctx[1].contributionFrequency !== void 0) {
			switch_1_props.value = /*$userForm*/ ctx[1].contributionFrequency;
		}

		switch_1 = new Switch({ props: switch_1_props });
		binding_callbacks.push(() => bind$1(switch_1, 'value', switch_1_value_binding));
		pricingtips = new PricingTips({});

		function inputfield0_value_binding(value) {
			/*inputfield0_value_binding*/ ctx[16](value);
		}

		let inputfield0_props = { label: "First Name" };

		if (/*$userForm*/ ctx[1].firstName !== void 0) {
			inputfield0_props.value = /*$userForm*/ ctx[1].firstName;
		}

		inputfield0 = new InputField({ props: inputfield0_props });
		binding_callbacks.push(() => bind$1(inputfield0, 'value', inputfield0_value_binding));
		let if_block0 = /*$formErrors*/ ctx[4].firstName != "" && create_if_block_2(ctx);

		function inputfield1_value_binding(value) {
			/*inputfield1_value_binding*/ ctx[17](value);
		}

		let inputfield1_props = { label: "Last Name" };

		if (/*$userForm*/ ctx[1].lastName !== void 0) {
			inputfield1_props.value = /*$userForm*/ ctx[1].lastName;
		}

		inputfield1 = new InputField({ props: inputfield1_props });
		binding_callbacks.push(() => bind$1(inputfield1, 'value', inputfield1_value_binding));
		let if_block1 = /*$formErrors*/ ctx[4].lastName != "" && create_if_block_1$2(ctx);

		function inputfield2_value_binding(value) {
			/*inputfield2_value_binding*/ ctx[18](value);
		}

		let inputfield2_props = { label: "Email" };

		if (/*$userForm*/ ctx[1].email !== void 0) {
			inputfield2_props.value = /*$userForm*/ ctx[1].email;
		}

		inputfield2 = new InputField({ props: inputfield2_props });
		binding_callbacks.push(() => bind$1(inputfield2, 'value', inputfield2_value_binding));
		let if_block2 = /*$formErrors*/ ctx[4].email != "" && create_if_block$2(ctx);

		function inputfield3_value_binding(value) {
			/*inputfield3_value_binding*/ ctx[19](value);
		}

		let inputfield3_props = { label: "Address" };

		if (/*$userForm*/ ctx[1].address !== void 0) {
			inputfield3_props.value = /*$userForm*/ ctx[1].address;
		}

		inputfield3 = new InputField({ props: inputfield3_props });
		binding_callbacks.push(() => bind$1(inputfield3, 'value', inputfield3_value_binding));

		function inputfield4_value_binding(value) {
			/*inputfield4_value_binding*/ ctx[20](value);
		}

		let inputfield4_props = { label: "Postal Code" };

		if (/*$userForm*/ ctx[1].postalCode !== void 0) {
			inputfield4_props.value = /*$userForm*/ ctx[1].postalCode;
		}

		inputfield4 = new InputField({ props: inputfield4_props });
		binding_callbacks.push(() => bind$1(inputfield4, 'value', inputfield4_value_binding));

		function inputfield5_value_binding(value) {
			/*inputfield5_value_binding*/ ctx[21](value);
		}

		let inputfield5_props = { label: "City" };

		if (/*$userForm*/ ctx[1].city !== void 0) {
			inputfield5_props.value = /*$userForm*/ ctx[1].city;
		}

		inputfield5 = new InputField({ props: inputfield5_props });
		binding_callbacks.push(() => bind$1(inputfield5, 'value', inputfield5_value_binding));
		binding_group = init_binding_group(/*$$binding_groups*/ ctx[8][0]);

		return {
			c() {
				div2 = element("div");
				div0 = element("div");
				create_component(switch_1.$$.fragment);
				t0 = space();
				div1 = element("div");
				create_component(pricingtips.$$.fragment);
				t1 = space();
				div15 = element("div");
				p = element("p");
				p.textContent = "How many trees would you like to plant?";
				t3 = space();
				div14 = element("div");
				div12 = element("div");
				div11 = element("div");
				div4 = element("div");
				label0 = element("label");
				input0 = element("input");
				t4 = space();
				div3 = element("div");
				div3.textContent = "1";
				t6 = space();
				div6 = element("div");
				label1 = element("label");
				input1 = element("input");
				t7 = space();
				div5 = element("div");
				div5.textContent = "4";
				t9 = space();
				div8 = element("div");
				label2 = element("label");
				input2 = element("input");
				t10 = space();
				div7 = element("div");
				div7.textContent = "11";
				t12 = space();
				div10 = element("div");
				label3 = element("label");
				input3 = element("input");
				t13 = space();
				div9 = element("div");
				div9.textContent = "22";
				t15 = space();
				div13 = element("div");
				span = element("span");
				t16 = text("€ ");
				t17 = text(/*$totalPrice*/ ctx[3]);
				t18 = space();
				div18 = element("div");
				div16 = element("div");
				create_component(inputfield0.$$.fragment);
				t19 = space();
				if (if_block0) if_block0.c();
				t20 = space();
				div17 = element("div");
				create_component(inputfield1.$$.fragment);
				t21 = space();
				if (if_block1) if_block1.c();
				t22 = space();
				div19 = element("div");
				create_component(inputfield2.$$.fragment);
				t23 = space();
				if (if_block2) if_block2.c();
				t24 = space();
				create_component(inputfield3.$$.fragment);
				t25 = space();
				div22 = element("div");
				div20 = element("div");
				create_component(inputfield4.$$.fragment);
				t26 = space();
				div21 = element("div");
				create_component(inputfield5.$$.fragment);
				attr(div0, "class", "flex justify-center");
				attr(div1, "class", "mt-4");
				attr(div2, "class", "block mb-2 w-full");
				attr(p, "class", "text-center font-bold mb-2");
				attr(input0, "type", "radio");
				attr(input0, "class", "form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]");
				input0.__value = 1;
				set_input_value(input0, input0.__value);
				input0.checked = input0_checked_value = /*$contributionValue*/ ctx[2] === 1;
				attr(div3, "class", "text-center text-xs");
				attr(div4, "class", "");
				attr(input1, "type", "radio");
				attr(input1, "class", "form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]");
				input1.__value = 4;
				set_input_value(input1, input1.__value);
				input1.checked = input1_checked_value = /*$contributionValue*/ ctx[2] === 4;
				attr(div5, "class", "text-center text-xs");
				attr(div6, "class", "");
				attr(input2, "type", "radio");
				attr(input2, "class", "form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]");
				input2.__value = 11;
				set_input_value(input2, input2.__value);
				input2.checked = input2_checked_value = /*$contributionValue*/ ctx[2] === 11;
				attr(div7, "class", "text-center text-xs");
				attr(div8, "class", "");
				attr(input3, "type", "radio");
				attr(input3, "class", "form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]");
				input3.__value = 22;
				set_input_value(input3, input3.__value);
				input3.checked = input3_checked_value = /*$contributionValue*/ ctx[2] === 22;
				attr(div9, "class", "text-center text-xs");
				attr(div10, "class", "");
				attr(div11, "class", "flex items-center justify-between mr-6");
				attr(div12, "class", "w-5/6");
				attr(span, "id", "total-price");
				attr(span, "class", "text-sm bg-[#5F753D] text-white rounded-md px-1 py-2");
				attr(div13, "class", "W-1/6 flex items-center");
				set_style(div13, "min-width", "65px");
				attr(div14, "class", "flex items-start justify-end");
				attr(div14, "id", "items-price-container");
				attr(div15, "class", "block mb-4 w-full px-1 py-2");
				attr(div16, "class", "w-full md:w-1/2 md:mr-2 text-left");
				attr(div17, "class", "w-full md:w-1/2 text-left");
				attr(div18, "class", "flex flex-col md:flex-row justify-between");
				attr(div19, "class", "text-left");
				attr(div20, "class", "w-full md:w-1/2 md:mr-2");
				attr(div21, "class", "w-full md:w-1/2");
				attr(div22, "class", "flex flex-col md:flex-row justify-between");
				binding_group.p(input0, input1, input2, input3);
			},
			m(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				mount_component(switch_1, div0, null);
				append(div2, t0);
				append(div2, div1);
				mount_component(pricingtips, div1, null);
				insert(target, t1, anchor);
				insert(target, div15, anchor);
				append(div15, p);
				append(div15, t3);
				append(div15, div14);
				append(div14, div12);
				append(div12, div11);
				append(div11, div4);
				append(div4, label0);
				append(label0, input0);
				input0.checked = input0.__value === /*group*/ ctx[0];
				append(label0, t4);
				append(label0, div3);
				append(div11, t6);
				append(div11, div6);
				append(div6, label1);
				append(label1, input1);
				input1.checked = input1.__value === /*group*/ ctx[0];
				append(label1, t7);
				append(label1, div5);
				append(div11, t9);
				append(div11, div8);
				append(div8, label2);
				append(label2, input2);
				input2.checked = input2.__value === /*group*/ ctx[0];
				append(label2, t10);
				append(label2, div7);
				append(div11, t12);
				append(div11, div10);
				append(div10, label3);
				append(label3, input3);
				input3.checked = input3.__value === /*group*/ ctx[0];
				append(label3, t13);
				append(label3, div9);
				append(div14, t15);
				append(div14, div13);
				append(div13, span);
				append(span, t16);
				append(span, t17);
				insert(target, t18, anchor);
				insert(target, div18, anchor);
				append(div18, div16);
				mount_component(inputfield0, div16, null);
				append(div16, t19);
				if (if_block0) if_block0.m(div16, null);
				append(div18, t20);
				append(div18, div17);
				mount_component(inputfield1, div17, null);
				append(div17, t21);
				if (if_block1) if_block1.m(div17, null);
				insert(target, t22, anchor);
				insert(target, div19, anchor);
				mount_component(inputfield2, div19, null);
				append(div19, t23);
				if (if_block2) if_block2.m(div19, null);
				insert(target, t24, anchor);
				mount_component(inputfield3, target, anchor);
				insert(target, t25, anchor);
				insert(target, div22, anchor);
				append(div22, div20);
				mount_component(inputfield4, div20, null);
				append(div22, t26);
				append(div22, div21);
				mount_component(inputfield5, div21, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen(input0, "change", /*input0_change_handler*/ ctx[7]),
						listen(input0, "change", /*change_handler*/ ctx[9]),
						listen(input1, "change", /*input1_change_handler*/ ctx[10]),
						listen(input1, "change", /*change_handler_1*/ ctx[11]),
						listen(input2, "change", /*input2_change_handler*/ ctx[12]),
						listen(input2, "change", /*change_handler_2*/ ctx[13]),
						listen(input3, "change", /*input3_change_handler*/ ctx[14]),
						listen(input3, "change", /*change_handler_3*/ ctx[15])
					];

					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				const switch_1_changes = {};

				if (!updating_value && dirty & /*$userForm*/ 2) {
					updating_value = true;
					switch_1_changes.value = /*$userForm*/ ctx[1].contributionFrequency;
					add_flush_callback(() => updating_value = false);
				}

				switch_1.$set(switch_1_changes);

				if (!current || dirty & /*$contributionValue*/ 4 && input0_checked_value !== (input0_checked_value = /*$contributionValue*/ ctx[2] === 1)) {
					input0.checked = input0_checked_value;
				}

				if (dirty & /*group*/ 1) {
					input0.checked = input0.__value === /*group*/ ctx[0];
				}

				if (!current || dirty & /*$contributionValue*/ 4 && input1_checked_value !== (input1_checked_value = /*$contributionValue*/ ctx[2] === 4)) {
					input1.checked = input1_checked_value;
				}

				if (dirty & /*group*/ 1) {
					input1.checked = input1.__value === /*group*/ ctx[0];
				}

				if (!current || dirty & /*$contributionValue*/ 4 && input2_checked_value !== (input2_checked_value = /*$contributionValue*/ ctx[2] === 11)) {
					input2.checked = input2_checked_value;
				}

				if (dirty & /*group*/ 1) {
					input2.checked = input2.__value === /*group*/ ctx[0];
				}

				if (!current || dirty & /*$contributionValue*/ 4 && input3_checked_value !== (input3_checked_value = /*$contributionValue*/ ctx[2] === 22)) {
					input3.checked = input3_checked_value;
				}

				if (dirty & /*group*/ 1) {
					input3.checked = input3.__value === /*group*/ ctx[0];
				}

				if (!current || dirty & /*$totalPrice*/ 8) set_data(t17, /*$totalPrice*/ ctx[3]);
				const inputfield0_changes = {};

				if (!updating_value_1 && dirty & /*$userForm*/ 2) {
					updating_value_1 = true;
					inputfield0_changes.value = /*$userForm*/ ctx[1].firstName;
					add_flush_callback(() => updating_value_1 = false);
				}

				inputfield0.$set(inputfield0_changes);

				if (/*$formErrors*/ ctx[4].firstName != "") {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_2(ctx);
						if_block0.c();
						if_block0.m(div16, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				const inputfield1_changes = {};

				if (!updating_value_2 && dirty & /*$userForm*/ 2) {
					updating_value_2 = true;
					inputfield1_changes.value = /*$userForm*/ ctx[1].lastName;
					add_flush_callback(() => updating_value_2 = false);
				}

				inputfield1.$set(inputfield1_changes);

				if (/*$formErrors*/ ctx[4].lastName != "") {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_1$2(ctx);
						if_block1.c();
						if_block1.m(div17, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				const inputfield2_changes = {};

				if (!updating_value_3 && dirty & /*$userForm*/ 2) {
					updating_value_3 = true;
					inputfield2_changes.value = /*$userForm*/ ctx[1].email;
					add_flush_callback(() => updating_value_3 = false);
				}

				inputfield2.$set(inputfield2_changes);

				if (/*$formErrors*/ ctx[4].email != "") {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block$2(ctx);
						if_block2.c();
						if_block2.m(div19, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				const inputfield3_changes = {};

				if (!updating_value_4 && dirty & /*$userForm*/ 2) {
					updating_value_4 = true;
					inputfield3_changes.value = /*$userForm*/ ctx[1].address;
					add_flush_callback(() => updating_value_4 = false);
				}

				inputfield3.$set(inputfield3_changes);
				const inputfield4_changes = {};

				if (!updating_value_5 && dirty & /*$userForm*/ 2) {
					updating_value_5 = true;
					inputfield4_changes.value = /*$userForm*/ ctx[1].postalCode;
					add_flush_callback(() => updating_value_5 = false);
				}

				inputfield4.$set(inputfield4_changes);
				const inputfield5_changes = {};

				if (!updating_value_6 && dirty & /*$userForm*/ 2) {
					updating_value_6 = true;
					inputfield5_changes.value = /*$userForm*/ ctx[1].city;
					add_flush_callback(() => updating_value_6 = false);
				}

				inputfield5.$set(inputfield5_changes);
			},
			i(local) {
				if (current) return;
				transition_in(switch_1.$$.fragment, local);
				transition_in(pricingtips.$$.fragment, local);
				transition_in(inputfield0.$$.fragment, local);
				transition_in(inputfield1.$$.fragment, local);
				transition_in(inputfield2.$$.fragment, local);
				transition_in(inputfield3.$$.fragment, local);
				transition_in(inputfield4.$$.fragment, local);
				transition_in(inputfield5.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(switch_1.$$.fragment, local);
				transition_out(pricingtips.$$.fragment, local);
				transition_out(inputfield0.$$.fragment, local);
				transition_out(inputfield1.$$.fragment, local);
				transition_out(inputfield2.$$.fragment, local);
				transition_out(inputfield3.$$.fragment, local);
				transition_out(inputfield4.$$.fragment, local);
				transition_out(inputfield5.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(div2);
					detach(t1);
					detach(div15);
					detach(t18);
					detach(div18);
					detach(t22);
					detach(div19);
					detach(t24);
					detach(t25);
					detach(div22);
				}

				destroy_component(switch_1);
				destroy_component(pricingtips);
				destroy_component(inputfield0);
				if (if_block0) if_block0.d();
				destroy_component(inputfield1);
				if (if_block1) if_block1.d();
				destroy_component(inputfield2);
				if (if_block2) if_block2.d();
				destroy_component(inputfield3, detaching);
				destroy_component(inputfield4);
				destroy_component(inputfield5);
				binding_group.r();
				mounted = false;
				run_all(dispose);
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		let $userForm;
		let $contributionValue;
		let $totalPrice;
		let $formErrors;
		component_subscribe($$self, userForm, $$value => $$invalidate(1, $userForm = $$value));
		component_subscribe($$self, contributionValue, $$value => $$invalidate(2, $contributionValue = $$value));
		component_subscribe($$self, totalPrice, $$value => $$invalidate(3, $totalPrice = $$value));
		component_subscribe($$self, formErrors, $$value => $$invalidate(4, $formErrors = $$value));
		let group = 1;

		const handleChange = (event, value) => {
			contributionValue.set(Number(value));
			event.target.checked = true;
		};

		const $$binding_groups = [[]];

		function switch_1_value_binding(value) {
			if ($$self.$$.not_equal($userForm.contributionFrequency, value)) {
				$userForm.contributionFrequency = value;
				userForm.set($userForm);
			}
		}

		function input0_change_handler() {
			group = this.__value;
			$$invalidate(0, group);
		}

		const change_handler = event => handleChange(event, 1);

		function input1_change_handler() {
			group = this.__value;
			$$invalidate(0, group);
		}

		const change_handler_1 = event => handleChange(event, 4);

		function input2_change_handler() {
			group = this.__value;
			$$invalidate(0, group);
		}

		const change_handler_2 = event => handleChange(event, 11);

		function input3_change_handler() {
			group = this.__value;
			$$invalidate(0, group);
		}

		const change_handler_3 = event => handleChange(event, 22);

		function inputfield0_value_binding(value) {
			if ($$self.$$.not_equal($userForm.firstName, value)) {
				$userForm.firstName = value;
				userForm.set($userForm);
			}
		}

		function inputfield1_value_binding(value) {
			if ($$self.$$.not_equal($userForm.lastName, value)) {
				$userForm.lastName = value;
				userForm.set($userForm);
			}
		}

		function inputfield2_value_binding(value) {
			if ($$self.$$.not_equal($userForm.email, value)) {
				$userForm.email = value;
				userForm.set($userForm);
			}
		}

		function inputfield3_value_binding(value) {
			if ($$self.$$.not_equal($userForm.address, value)) {
				$userForm.address = value;
				userForm.set($userForm);
			}
		}

		function inputfield4_value_binding(value) {
			if ($$self.$$.not_equal($userForm.postalCode, value)) {
				$userForm.postalCode = value;
				userForm.set($userForm);
			}
		}

		function inputfield5_value_binding(value) {
			if ($$self.$$.not_equal($userForm.city, value)) {
				$userForm.city = value;
				userForm.set($userForm);
			}
		}

		return [
			group,
			$userForm,
			$contributionValue,
			$totalPrice,
			$formErrors,
			handleChange,
			switch_1_value_binding,
			input0_change_handler,
			$$binding_groups,
			change_handler,
			input1_change_handler,
			change_handler_1,
			input2_change_handler,
			change_handler_2,
			input3_change_handler,
			change_handler_3,
			inputfield0_value_binding,
			inputfield1_value_binding,
			inputfield2_value_binding,
			inputfield3_value_binding,
			inputfield4_value_binding,
			inputfield5_value_binding
		];
	}

	class UserDetailsForm extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
		}
	}

	/* components\CheckoutForm.svelte generated by Svelte v4.2.1 */

	function create_else_block(ctx) {
		let thankyouform;
		let current;
		thankyouform = new ThankyouForm({});

		return {
			c() {
				create_component(thankyouform.$$.fragment);
			},
			m(target, anchor) {
				mount_component(thankyouform, target, anchor);
				current = true;
			},
			p: noop$1,
			i(local) {
				if (current) return;
				transition_in(thankyouform.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(thankyouform.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(thankyouform, detaching);
			}
		};
	}

	// (17:38) 
	function create_if_block_1$1(ctx) {
		let paymentform;
		let current;

		paymentform = new PaymentForm({
				props: {
					handleStepProgress: /*handleStepProgress*/ ctx[1]
				}
			});

		return {
			c() {
				create_component(paymentform.$$.fragment);
			},
			m(target, anchor) {
				mount_component(paymentform, target, anchor);
				current = true;
			},
			p(ctx, dirty) {
				const paymentform_changes = {};
				if (dirty & /*handleStepProgress*/ 2) paymentform_changes.handleStepProgress = /*handleStepProgress*/ ctx[1];
				paymentform.$set(paymentform_changes);
			},
			i(local) {
				if (current) return;
				transition_in(paymentform.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(paymentform.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(paymentform, detaching);
			}
		};
	}

	// (15:4) {#if activeStep == "Your Info"}
	function create_if_block$1(ctx) {
		let userdetailsform;
		let current;
		userdetailsform = new UserDetailsForm({});

		return {
			c() {
				create_component(userdetailsform.$$.fragment);
			},
			m(target, anchor) {
				mount_component(userdetailsform, target, anchor);
				current = true;
			},
			p: noop$1,
			i(local) {
				if (current) return;
				transition_in(userdetailsform.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(userdetailsform.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				destroy_component(userdetailsform, detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		let form;
		let current_block_type_index;
		let if_block;
		let current;
		let mounted;
		let dispose;
		const if_block_creators = [create_if_block$1, create_if_block_1$1, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*activeStep*/ ctx[0] == "Your Info") return 0;
			if (/*activeStep*/ ctx[0] == "Payment") return 1;
			return 2;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c() {
				form = element("form");
				if_block.c();
				attr(form, "class", "bg-white rounded px-8 pt-2 pb-2 mb-2");
			},
			m(target, anchor) {
				insert(target, form, anchor);
				if_blocks[current_block_type_index].m(form, null);
				current = true;

				if (!mounted) {
					dispose = listen(form, "submit", prevent_default(/*processPayment*/ ctx[2]));
					mounted = true;
				}
			},
			p(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(form, null);
				}
			},
			i(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o(local) {
				transition_out(if_block);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(form);
				}

				if_blocks[current_block_type_index].d();
				mounted = false;
				dispose();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { activeStep } = $$props;
		let { handleStepProgress } = $$props;

		const processPayment = () => {
			
		};

		$$self.$$set = $$props => {
			if ('activeStep' in $$props) $$invalidate(0, activeStep = $$props.activeStep);
			if ('handleStepProgress' in $$props) $$invalidate(1, handleStepProgress = $$props.handleStepProgress);
		};

		return [activeStep, handleStepProgress, processPayment];
	}

	class CheckoutForm extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { activeStep: 0, handleStepProgress: 1 });
		}
	}

	/* Tailwind.svelte generated by Svelte v4.2.1 */

	function add_css(target) {
		append_styles(target, "svelte-11v4n1o", "*,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}::before,::after{--tw-content:''}html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";font-feature-settings:normal;font-variation-settings:normal}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-0.25em}sup{top:-0.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,[type='button'],[type='reset'],[type='submit']{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type='search']{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=\"button\"]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}[type='text'],input:where(:not([type])),[type='email'],[type='url'],[type='password'],[type='number'],[type='date'],[type='datetime-local'],[type='month'],[type='search'],[type='tel'],[type='time'],[type='week'],[multiple],textarea,select{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#fff;border-color:#6b7280;border-width:1px;border-radius:0px;padding-top:0.5rem;padding-right:0.75rem;padding-bottom:0.5rem;padding-left:0.75rem;font-size:1rem;line-height:1.5rem;--tw-shadow:0 0 #0000}[type='text']:focus,input:where(:not([type])):focus,[type='email']:focus,[type='url']:focus,[type='password']:focus,[type='number']:focus,[type='date']:focus,[type='datetime-local']:focus,[type='month']:focus,[type='search']:focus,[type='tel']:focus,[type='time']:focus,[type='week']:focus,[multiple]:focus,textarea:focus,select:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:#2563eb;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);border-color:#2563eb}input::-moz-placeholder,textarea::-moz-placeholder{color:#6b7280;opacity:1}input::placeholder,textarea::placeholder{color:#6b7280;opacity:1}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-date-and-time-value{min-height:1.5em;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit,::-webkit-datetime-edit-year-field,::-webkit-datetime-edit-month-field,::-webkit-datetime-edit-day-field,::-webkit-datetime-edit-hour-field,::-webkit-datetime-edit-minute-field,::-webkit-datetime-edit-second-field,::-webkit-datetime-edit-millisecond-field,::-webkit-datetime-edit-meridiem-field{padding-top:0;padding-bottom:0}select{background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\");background-position:right 0.5rem center;background-repeat:no-repeat;background-size:1.5em 1.5em;padding-right:2.5rem;print-color-adjust:exact}[multiple],[size]:where(select:not([size=\"1\"])){background-image:initial;background-position:initial;background-repeat:unset;background-size:initial;padding-right:0.75rem;print-color-adjust:unset}[type='checkbox'],[type='radio']{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0;print-color-adjust:exact;display:inline-block;vertical-align:middle;background-origin:border-box;-webkit-user-select:none;-moz-user-select:none;user-select:none;flex-shrink:0;height:1rem;width:1rem;color:#2563eb;background-color:#fff;border-color:#6b7280;border-width:1px;--tw-shadow:0 0 #0000}[type='checkbox']{border-radius:0px}[type='radio']{border-radius:100%}[type='checkbox']:focus,[type='radio']:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:2px;--tw-ring-offset-color:#fff;--tw-ring-color:#2563eb;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}[type='checkbox']:checked,[type='radio']:checked{border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}[type='checkbox']:checked{background-image:url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")}[type='radio']:checked{background-image:url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e\")}[type='checkbox']:checked:hover,[type='checkbox']:checked:focus,[type='radio']:checked:hover,[type='radio']:checked:focus{border-color:transparent;background-color:currentColor}[type='checkbox']:indeterminate{background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e\");border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}[type='checkbox']:indeterminate:hover,[type='checkbox']:indeterminate:focus{border-color:transparent;background-color:currentColor}[type='file']{background:unset;border-color:inherit;border-width:0;border-radius:0;padding:0;font-size:unset;line-height:inherit}[type='file']:focus{outline:1px solid ButtonText;outline:1px auto -webkit-focus-ring-color}*,::before,::after{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x:  ;--tw-pan-y:  ;--tw-pinch-zoom:  ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position:  ;--tw-gradient-via-position:  ;--tw-gradient-to-position:  ;--tw-ordinal:  ;--tw-slashed-zero:  ;--tw-numeric-figure:  ;--tw-numeric-spacing:  ;--tw-numeric-fraction:  ;--tw-ring-inset:  ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246 / 0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur:  ;--tw-brightness:  ;--tw-contrast:  ;--tw-grayscale:  ;--tw-hue-rotate:  ;--tw-invert:  ;--tw-saturate:  ;--tw-sepia:  ;--tw-drop-shadow:  ;--tw-backdrop-blur:  ;--tw-backdrop-brightness:  ;--tw-backdrop-contrast:  ;--tw-backdrop-grayscale:  ;--tw-backdrop-hue-rotate:  ;--tw-backdrop-invert:  ;--tw-backdrop-opacity:  ;--tw-backdrop-saturate:  ;--tw-backdrop-sepia:  }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x:  ;--tw-pan-y:  ;--tw-pinch-zoom:  ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position:  ;--tw-gradient-via-position:  ;--tw-gradient-to-position:  ;--tw-ordinal:  ;--tw-slashed-zero:  ;--tw-numeric-figure:  ;--tw-numeric-spacing:  ;--tw-numeric-fraction:  ;--tw-ring-inset:  ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246 / 0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur:  ;--tw-brightness:  ;--tw-contrast:  ;--tw-grayscale:  ;--tw-hue-rotate:  ;--tw-invert:  ;--tw-saturate:  ;--tw-sepia:  ;--tw-drop-shadow:  ;--tw-backdrop-blur:  ;--tw-backdrop-brightness:  ;--tw-backdrop-contrast:  ;--tw-backdrop-grayscale:  ;--tw-backdrop-hue-rotate:  ;--tw-backdrop-invert:  ;--tw-backdrop-opacity:  ;--tw-backdrop-saturate:  ;--tw-backdrop-sepia:  }.container{width:100%}@media(min-width: 640px){.container{max-width:640px}}@media(min-width: 768px){.container{max-width:768px}}@media(min-width: 1024px){.container{max-width:1024px}}@media(min-width: 1280px){.container{max-width:1280px}}@media(min-width: 1536px){.container{max-width:1536px}}.form-input,.form-textarea,.form-select,.form-multiselect{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#fff;border-color:#6b7280;border-width:1px;border-radius:0px;padding-top:0.5rem;padding-right:0.75rem;padding-bottom:0.5rem;padding-left:0.75rem;font-size:1rem;line-height:1.5rem;--tw-shadow:0 0 #0000}.form-input:focus,.form-textarea:focus,.form-select:focus,.form-multiselect:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:#2563eb;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);border-color:#2563eb}.form-input::-moz-placeholder,.form-textarea::-moz-placeholder{color:#6b7280;opacity:1}.form-input::placeholder,.form-textarea::placeholder{color:#6b7280;opacity:1}.form-input::-webkit-datetime-edit-fields-wrapper{padding:0}.form-input::-webkit-date-and-time-value{min-height:1.5em;text-align:inherit}.form-input::-webkit-datetime-edit{display:inline-flex}.form-input::-webkit-datetime-edit,.form-input::-webkit-datetime-edit-year-field,.form-input::-webkit-datetime-edit-month-field,.form-input::-webkit-datetime-edit-day-field,.form-input::-webkit-datetime-edit-hour-field,.form-input::-webkit-datetime-edit-minute-field,.form-input::-webkit-datetime-edit-second-field,.form-input::-webkit-datetime-edit-millisecond-field,.form-input::-webkit-datetime-edit-meridiem-field{padding-top:0;padding-bottom:0}.form-select{background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\");background-position:right 0.5rem center;background-repeat:no-repeat;background-size:1.5em 1.5em;padding-right:2.5rem;print-color-adjust:exact}.form-select:where([size]:not([size=\"1\"])){background-image:initial;background-position:initial;background-repeat:unset;background-size:initial;padding-right:0.75rem;print-color-adjust:unset}.form-checkbox,.form-radio{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0;print-color-adjust:exact;display:inline-block;vertical-align:middle;background-origin:border-box;-webkit-user-select:none;-moz-user-select:none;user-select:none;flex-shrink:0;height:1rem;width:1rem;color:#2563eb;background-color:#fff;border-color:#6b7280;border-width:1px;--tw-shadow:0 0 #0000}.form-checkbox{border-radius:0px}.form-radio{border-radius:100%}.form-checkbox:focus,.form-radio:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset:var(--tw-empty,/*!*/ /*!*/);--tw-ring-offset-width:2px;--tw-ring-offset-color:#fff;--tw-ring-color:#2563eb;--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.form-checkbox:checked,.form-radio:checked{border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}.form-checkbox:checked{background-image:url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")}.form-radio:checked{background-image:url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e\")}.form-checkbox:checked:hover,.form-checkbox:checked:focus,.form-radio:checked:hover,.form-radio:checked:focus{border-color:transparent;background-color:currentColor}.form-checkbox:indeterminate{background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e\");border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}.form-checkbox:indeterminate:hover,.form-checkbox:indeterminate:focus{border-color:transparent;background-color:currentColor}.pointer-events-none{pointer-events:none}.invisible{visibility:hidden}.fixed{position:fixed}.absolute{position:absolute}.relative{position:relative}.-left-\\[55px\\]{left:-55px}.-top-\\[50px\\]{top:-50px}.right-4{right:1rem}.top-\\[25px\\]{top:25px}.z-0{z-index:0}.mx-auto{margin-left:auto;margin-right:auto}.my-1{margin-top:0.25rem;margin-bottom:0.25rem}.mb-2{margin-bottom:0.5rem}.mb-4{margin-bottom:1rem}.mb-8{margin-bottom:2rem}.ml-2{margin-left:0.5rem}.mr-6{margin-right:1.5rem}.mt-0{margin-top:0px}.mt-1{margin-top:0.25rem}.mt-2{margin-top:0.5rem}.mt-4{margin-top:1rem}.mt-8{margin-top:2rem}.block{display:block}.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.hidden{display:none}.h-24{height:6rem}.h-4{height:1rem}.h-auto{height:auto}.h-full{height:100%}.w-1\\/2{width:50%}.w-4{width:1rem}.w-5\\/6{width:83.333333%}.w-full{width:100%}.w-max{width:-moz-max-content;width:max-content}.max-w-4xl{max-width:56rem}.max-w-full{max-width:100%}.max-w-md{max-width:28rem}.max-w-xl{max-width:36rem}.transform{transform:translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.grid-cols-1{grid-template-columns:repeat(1, minmax(0, 1fr))}.grid-cols-2{grid-template-columns:repeat(2, minmax(0, 1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.place-items-center{place-items:center}.items-start{align-items:flex-start}.items-center{align-items:center}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-2{gap:0.5rem}.gap-6{gap:1.5rem}.space-x-4>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(1rem * var(--tw-space-x-reverse));margin-left:calc(1rem * calc(1 - var(--tw-space-x-reverse)))}.divide-y>:not([hidden])~:not([hidden]){--tw-divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)));border-bottom-width:calc(1px * var(--tw-divide-y-reverse))}.overflow-hidden{overflow:hidden}.rounded{border-radius:0.25rem}.rounded-2xl{border-radius:1rem}.rounded-\\[50px\\]{border-radius:50px}.rounded-full{border-radius:9999px}.rounded-md{border-radius:0.375rem}.rounded-none{border-radius:0px}.rounded-l{border-top-left-radius:0.25rem;border-bottom-left-radius:0.25rem}.rounded-l-2xl{border-top-left-radius:1rem;border-bottom-left-radius:1rem}.rounded-t-2xl{border-top-left-radius:1rem;border-top-right-radius:1rem}.border{border-width:1px}.border-0{border-width:0px}.border-2{border-width:2px}.border-b-2{border-bottom-width:2px}.border-solid{border-style:solid}.border-\\[\\#5F753D\\]{--tw-border-opacity:1;border-color:rgb(95 117 61 / var(--tw-border-opacity))}.border-\\[\\#EFE3DE\\]{--tw-border-opacity:1;border-color:rgb(239 227 222 / var(--tw-border-opacity))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235 / var(--tw-border-opacity))}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219 / var(--tw-border-opacity))}.border-green-800{--tw-border-opacity:1;border-color:rgb(22 101 52 / var(--tw-border-opacity))}.border-transparent{border-color:transparent}.bg-\\[\\#5F753D\\]{--tw-bg-opacity:1;background-color:rgb(95 117 61 / var(--tw-bg-opacity))}.bg-\\[\\#DEE37D\\]{--tw-bg-opacity:1;background-color:rgb(222 227 125 / var(--tw-bg-opacity))}.bg-\\[\\#F5F2F0\\]{--tw-bg-opacity:1;background-color:rgb(245 242 240 / var(--tw-bg-opacity))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgb(243 244 246 / var(--tw-bg-opacity))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(229 231 235 / var(--tw-bg-opacity))}.bg-gray-300{--tw-bg-opacity:1;background-color:rgb(209 213 219 / var(--tw-bg-opacity))}.bg-teal-800{--tw-bg-opacity:1;background-color:rgb(17 94 89 / var(--tw-bg-opacity))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255 / var(--tw-bg-opacity))}.p-1{padding:0.25rem}.p-2{padding:0.5rem}.px-0{padding-left:0px;padding-right:0px}.px-0\\.5{padding-left:0.125rem;padding-right:0.125rem}.px-1{padding-left:0.25rem;padding-right:0.25rem}.px-16{padding-left:4rem;padding-right:4rem}.px-2{padding-left:0.5rem;padding-right:0.5rem}.px-20{padding-left:5rem;padding-right:5rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.px-8{padding-left:2rem;padding-right:2rem}.py-1{padding-top:0.25rem;padding-bottom:0.25rem}.py-12{padding-top:3rem;padding-bottom:3rem}.py-2{padding-top:0.5rem;padding-bottom:0.5rem}.py-20{padding-top:5rem;padding-bottom:5rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-8{padding-top:2rem;padding-bottom:2rem}.pb-2{padding-bottom:0.5rem}.pb-4{padding-bottom:1rem}.pb-8{padding-bottom:2rem}.pl-1{padding-left:0.25rem}.pt-2{padding-top:0.5rem}.pt-4{padding-top:1rem}.pt-6{padding-top:1.5rem}.pt-8{padding-top:2rem}.text-left{text-align:left}.text-center{text-align:center}.text-right{text-align:right}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-4xl{font-size:2.25rem;line-height:2.5rem}.text-\\[10px\\]{font-size:10px}.text-\\[11px\\]{font-size:11px}.text-\\[8px\\]{font-size:8px}.text-base{font-size:1rem;line-height:1.5rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:0.875rem;line-height:1.25rem}.text-xs{font-size:0.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.text-\\[\\#5F753D\\]{--tw-text-opacity:1;color:rgb(95 117 61 / var(--tw-text-opacity))}.text-black{--tw-text-opacity:1;color:rgb(0 0 0 / var(--tw-text-opacity))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128 / var(--tw-text-opacity))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99 / var(--tw-text-opacity))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81 / var(--tw-text-opacity))}.text-gray-800{--tw-text-opacity:1;color:rgb(31 41 55 / var(--tw-text-opacity))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39 / var(--tw-text-opacity))}.text-indigo-600{--tw-text-opacity:1;color:rgb(79 70 229 / var(--tw-text-opacity))}.text-red-500{--tw-text-opacity:1;color:rgb(239 68 68 / var(--tw-text-opacity))}.text-teal-900{--tw-text-opacity:1;color:rgb(19 78 74 / var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255 / var(--tw-text-opacity))}.underline{-webkit-text-decoration-line:underline;text-decoration-line:underline}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.placeholder-\\[\\#EFE3DE\\]::-moz-placeholder{--tw-placeholder-opacity:1;color:rgb(239 227 222 / var(--tw-placeholder-opacity))}.placeholder-\\[\\#EFE3DE\\]::placeholder{--tw-placeholder-opacity:1;color:rgb(239 227 222 / var(--tw-placeholder-opacity))}.opacity-0{opacity:0}.shadow{--tw-shadow:0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)}.shadow-2xl{--tw-shadow:0 25px 50px -12px rgb(0 0 0 / 0.25);--tw-shadow-colored:0 25px 50px -12px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgb(0 0 0 / 0.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)}.outline{outline-style:solid}.blur{--tw-blur:blur(8px);filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition{transition-property:color, background-color, border-color, fill, stroke, opacity, box-shadow, transform, filter, -webkit-text-decoration-color, -webkit-backdrop-filter;transition-property:color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;transition-property:color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, -webkit-text-decoration-color, -webkit-backdrop-filter;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms}.transition-opacity{transition-property:opacity;transition-timing-function:cubic-bezier(0.4, 0, 0.2, 1);transition-duration:150ms}.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.checked\\:bg-\\[\\#5F753D\\]:checked{--tw-bg-opacity:1;background-color:rgb(95 117 61 / var(--tw-bg-opacity))}.hover\\:bg-\\[\\#a7ac4a\\]:hover{--tw-bg-opacity:1;background-color:rgb(167 172 74 / var(--tw-bg-opacity))}.hover\\:bg-gray-400:hover{--tw-bg-opacity:1;background-color:rgb(156 163 175 / var(--tw-bg-opacity))}.hover\\:bg-teal-900:hover{--tw-bg-opacity:1;background-color:rgb(19 78 74 / var(--tw-bg-opacity))}.focus\\:border-\\[\\#EFE3DE\\]:focus{--tw-border-opacity:1;border-color:rgb(239 227 222 / var(--tw-border-opacity))}.focus\\:border-black:focus{--tw-border-opacity:1;border-color:rgb(0 0 0 / var(--tw-border-opacity))}.focus\\:border-gray-300:focus{--tw-border-opacity:1;border-color:rgb(209 213 219 / var(--tw-border-opacity))}.focus\\:border-gray-500:focus{--tw-border-opacity:1;border-color:rgb(107 114 128 / var(--tw-border-opacity))}.focus\\:border-indigo-300:focus{--tw-border-opacity:1;border-color:rgb(165 180 252 / var(--tw-border-opacity))}.focus\\:border-transparent:focus{border-color:transparent}.focus\\:bg-gray-200:focus{--tw-bg-opacity:1;background-color:rgb(229 231 235 / var(--tw-bg-opacity))}.focus\\:bg-white:focus{--tw-bg-opacity:1;background-color:rgb(255 255 255 / var(--tw-bg-opacity))}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)}.focus\\:ring-0:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)}.focus\\:ring-1:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)}.focus\\:ring-\\[\\#EFE3DE\\]:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(239 227 222 / var(--tw-ring-opacity))}.focus\\:ring-black:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(0 0 0 / var(--tw-ring-opacity))}.focus\\:ring-gray-500:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(107 114 128 / var(--tw-ring-opacity))}.focus\\:ring-indigo-200:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(199 210 254 / var(--tw-ring-opacity))}.focus\\:ring-opacity-50:focus{--tw-ring-opacity:0.5}.focus\\:ring-offset-0:focus{--tw-ring-offset-width:0px}.focus\\:ring-offset-2:focus{--tw-ring-offset-width:2px}.group:hover .group-hover\\:opacity-100{opacity:1}@media(min-width: 640px){.sm\\:px-4{padding-left:1rem;padding-right:1rem}}@media(min-width: 768px){.md\\:-left-\\[5px\\]{left:-5px}.md\\:-top-\\[60px\\]{top:-60px}.md\\:right-10{right:2.5rem}.md\\:top-10{top:2.5rem}.md\\:mr-2{margin-right:0.5rem}.md\\:block{display:block}.md\\:flex{display:flex}.md\\:hidden{display:none}.md\\:h-\\[650px\\]{height:650px}.md\\:w-1\\/2{width:50%}.md\\:max-w-4xl{max-width:56rem}.md\\:max-w-6xl{max-width:72rem}.md\\:grid-cols-2{grid-template-columns:repeat(2, minmax(0, 1fr))}.md\\:flex-row{flex-direction:row}.md\\:rounded-r-2xl{border-top-right-radius:1rem;border-bottom-right-radius:1rem}.md\\:p-8{padding:2rem}.md\\:px-2{padding-left:0.5rem;padding-right:0.5rem}.md\\:px-4{padding-left:1rem;padding-right:1rem}.md\\:px-8{padding-left:2rem;padding-right:2rem}.md\\:text-\\[10px\\]{font-size:10px}.md\\:text-\\[9px\\]{font-size:9px}.md\\:text-lg{font-size:1.125rem;line-height:1.75rem}}");
	}

	class Tailwind extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, null, null, safe_not_equal, {}, add_css);
		}
	}

	/* App.svelte generated by Svelte v4.2.1 */

	function create_if_block(ctx) {
		let div1;
		let div0;
		let if_block = /*steps*/ ctx[4][/*currentActive*/ ctx[0] - 1] == "Your Info" && create_if_block_1(ctx);

		return {
			c() {
				div1 = element("div");
				div0 = element("div");
				if (if_block) if_block.c();
				attr(div0, "class", "step-button");
				attr(div1, "class", "block text-right px-8 pt-2 pb-2");
			},
			m(target, anchor) {
				insert(target, div1, anchor);
				append(div1, div0);
				if (if_block) if_block.m(div0, null);
			},
			p(ctx, dirty) {
				if (/*steps*/ ctx[4][/*currentActive*/ ctx[0] - 1] == "Your Info") {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block_1(ctx);
						if_block.c();
						if_block.m(div0, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(div1);
				}

				if (if_block) if_block.d();
			}
		};
	}

	// (141:32) {#if steps[currentActive-1] == "Your Info"}
	function create_if_block_1(ctx) {
		let button;
		let t_1;
		let button_disabled_value;
		let mounted;
		let dispose;

		return {
			c() {
				button = element("button");
				t_1 = text("Next");
				attr(button, "class", "bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 rounded-full");
				button.disabled = button_disabled_value = /*currentActive*/ ctx[0] == /*steps*/ ctx[4].length;
			},
			m(target, anchor) {
				insert(target, button, anchor);
				append(button, t_1);

				if (!mounted) {
					dispose = listen(button, "click", /*click_handler*/ ctx[8]);
					mounted = true;
				}
			},
			p(ctx, dirty) {
				if (dirty & /*currentActive*/ 1 && button_disabled_value !== (button_disabled_value = /*currentActive*/ ctx[0] == /*steps*/ ctx[4].length)) {
					button.disabled = button_disabled_value;
				}
			},
			d(detaching) {
				if (detaching) {
					detach(button);
				}

				mounted = false;
				dispose();
			}
		};
	}

	function create_fragment(ctx) {
		let script0;
		let script0_src_value;
		let script1;
		let script1_src_value;
		let t0;
		let tailwind;
		let t1;
		let div10;
		let div9;
		let div8;
		let div7;
		let div1;
		let div0;
		let t5;
		let div3;
		let div2;
		let t10;
		let div6;
		let div4;
		let progressbar;
		let updating_currentActive;
		let t11;
		let div5;
		let checkoutform;
		let t12;
		let current;
		tailwind = new Tailwind({});

		function progressbar_currentActive_binding(value) {
			/*progressbar_currentActive_binding*/ ctx[6](value);
		}

		let progressbar_props = { steps: /*steps*/ ctx[4] };

		if (/*currentActive*/ ctx[0] !== void 0) {
			progressbar_props.currentActive = /*currentActive*/ ctx[0];
		}

		progressbar = new ProgressBar({ props: progressbar_props });
		binding_callbacks.push(() => bind$1(progressbar, 'currentActive', progressbar_currentActive_binding));
		/*progressbar_binding*/ ctx[7](progressbar);

		checkoutform = new CheckoutForm({
				props: {
					handleStepProgress: /*handleProgress*/ ctx[5],
					activeStep: /*steps*/ ctx[4][/*currentActive*/ ctx[0] - 1]
				}
			});

		let if_block = /*$processingPayment*/ ctx[2] == false && create_if_block(ctx);

		return {
			c() {
				script0 = element("script");
				script0.innerHTML = ``;
				script1 = element("script");
				script1.innerHTML = ``;
				t0 = space();
				create_component(tailwind.$$.fragment);
				t1 = space();
				div10 = element("div");
				div9 = element("div");
				div8 = element("div");
				div7 = element("div");
				div1 = element("div");
				div0 = element("div");
				div0.innerHTML = `<h1 class="text-4xl font-medium mb-4">Plant more trees</h1> <p class="text-base font-semibold">Now it&#39;s your turn! Planting trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster biodiversity. Join us in this vital mission for a greener, harmonious future!</p>`;
				t5 = space();
				div3 = element("div");
				div2 = element("div");
				div2.innerHTML = `<h1 class="text-2xl font-medium mb-4">Plant more trees</h1> <p class="text-sm font-semibold">Now it&#39;s your turn! Planting trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster biodiversity. Join us in this vital mission for a greener, harmonious future!</p> <br/>`;
				t10 = space();
				div6 = element("div");
				div4 = element("div");
				create_component(progressbar.$$.fragment);
				t11 = space();
				div5 = element("div");
				create_component(checkoutform.$$.fragment);
				t12 = space();
				if (if_block) if_block.c();
				if (!src_url_equal(script0.src, script0_src_value = "https://cdn.jsdelivr.net/npm/sweetalert2@11")) attr(script0, "src", script0_src_value);
				if (!src_url_equal(script1.src, script1_src_value = "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js")) attr(script1, "src", script1_src_value);
				attr(div0, "class", "text-gray-900 text-left px-8 w-5/6");
				attr(div1, "class", "hidden md:block md:w-1/2 relative z-1 bg-white pt-8 rounded-l-2xl overflow-hidden md:h-[650px]");
				set_style(div1, "background-image", "url('" + /*bgImageUrl*/ ctx[3] + "') ");
				attr(div2, "class", "text-gray-900 text-left px-8 w-full");
				attr(div3, "class", "block md:hidden bg-white pt-8 py-4 rounded-t-2xl mb-4");
				set_style(div3, "background-image", "linear-gradient(to bottom, transparent 0%, black 100%), url('" + /*bgImageUrl*/ ctx[3] + "') ");
				attr(div4, "class", "block mb-2");
				attr(div5, "class", "block");
				attr(div6, "class", "w-full md:w-1/2 relative z-0 bg-white rounded-none md:rounded-r-2xl py-8 h-full md:h-[650px] overflow-hidden");
				attr(div7, "class", "relative block md:flex items-center p-2 md:p-8");
				attr(div8, "class", "antialiased max-w-full md:max-w-6xl mx-auto px-2 md:px-8");
				attr(div9, "class", "h-auto place-items-center");
				attr(div10, "id", "widget-container");
				attr(div10, "class", "h-full block md:flex items-center justify-center");
			},
			m(target, anchor) {
				append(document.head, script0);
				append(document.head, script1);
				insert(target, t0, anchor);
				mount_component(tailwind, target, anchor);
				insert(target, t1, anchor);
				insert(target, div10, anchor);
				append(div10, div9);
				append(div9, div8);
				append(div8, div7);
				append(div7, div1);
				append(div1, div0);
				append(div7, t5);
				append(div7, div3);
				append(div3, div2);
				append(div7, t10);
				append(div7, div6);
				append(div6, div4);
				mount_component(progressbar, div4, null);
				append(div6, t11);
				append(div6, div5);
				mount_component(checkoutform, div5, null);
				append(div6, t12);
				if (if_block) if_block.m(div6, null);
				current = true;
			},
			p(ctx, [dirty]) {
				const progressbar_changes = {};

				if (!updating_currentActive && dirty & /*currentActive*/ 1) {
					updating_currentActive = true;
					progressbar_changes.currentActive = /*currentActive*/ ctx[0];
					add_flush_callback(() => updating_currentActive = false);
				}

				progressbar.$set(progressbar_changes);
				const checkoutform_changes = {};
				if (dirty & /*currentActive*/ 1) checkoutform_changes.activeStep = /*steps*/ ctx[4][/*currentActive*/ ctx[0] - 1];
				checkoutform.$set(checkoutform_changes);

				if (/*$processingPayment*/ ctx[2] == false) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div6, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i(local) {
				if (current) return;
				transition_in(tailwind.$$.fragment, local);
				transition_in(progressbar.$$.fragment, local);
				transition_in(checkoutform.$$.fragment, local);
				current = true;
			},
			o(local) {
				transition_out(tailwind.$$.fragment, local);
				transition_out(progressbar.$$.fragment, local);
				transition_out(checkoutform.$$.fragment, local);
				current = false;
			},
			d(detaching) {
				if (detaching) {
					detach(t0);
					detach(t1);
					detach(div10);
				}

				detach(script0);
				detach(script1);
				destroy_component(tailwind, detaching);
				/*progressbar_binding*/ ctx[7](null);
				destroy_component(progressbar);
				destroy_component(checkoutform);
				if (if_block) if_block.d();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let $userForm;
		let $formErrors;
		let $processingPayment;
		component_subscribe($$self, userForm, $$value => $$invalidate(9, $userForm = $$value));
		component_subscribe($$self, formErrors, $$value => $$invalidate(10, $formErrors = $$value));
		component_subscribe($$self, processingPayment, $$value => $$invalidate(2, $processingPayment = $$value));
		const bgImageUrl = new URL('./images/background.jpg', (_documentCurrentScript && _documentCurrentScript.src || new URL('ih-shop-widget.js', document.baseURI).href)).href;
		new URL('./images/logo.png', (_documentCurrentScript && _documentCurrentScript.src || new URL('ih-shop-widget.js', document.baseURI).href)).href;

		let steps = ['Your Info', 'Payment', 'Certificate'],
			currentActive = 1,
			progressBar;

		//let currentLanguage = ""; //default
		// onMount(() => {
		// 	currentLanguage = Weglot.getCurrentLang();
		//     $locale = currentLanguage;
		// });
		const handleProgress = stepIncrement => {
			//Form validationn (basic)
			//let emailValidationRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
			let emailValidationRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

			if ($userForm.firstName == "" || $userForm.lastName == "" || $userForm.email == "" || !$userForm.email.match(emailValidationRegex)) {
				if ($userForm.firstName == "") {
					set_store_value(formErrors, $formErrors.firstName = "First name field is required", $formErrors);
				} else {
					set_store_value(formErrors, $formErrors.firstName = "", $formErrors);
				}

				if ($userForm.lastName == "") {
					set_store_value(formErrors, $formErrors.lastName = "Last name field is required", $formErrors);
				} else {
					set_store_value(formErrors, $formErrors.lastName = "", $formErrors);
				}

				if ($userForm.email == "" || !$userForm.email.match(emailValidationRegex)) {
					set_store_value(formErrors, $formErrors.email = "Please enter a valid email address", $formErrors);
				} else {
					set_store_value(formErrors, $formErrors.email = "", $formErrors);
				}

				return false;
			}

			progressBar.handleProgress(stepIncrement);
		};

		// const getCurrentLanguage = () => {
		//     currentLanguage = Weglot.getCurrentLang();
		//     //update locale
		//     $locale = currentLanguage;
		// }
		// Weglot.on("languageChanged", getCurrentLanguage);
		//Testing, getting user's country
		axios$1.get('https://www.cloudflare.com/cdn-cgi/trace').then(function (response) {
			response = response.data.trim().split('\n').reduce(
				function (obj, pair) {
					pair = pair.split('=');
					return (obj[pair[0]] = pair[1], obj);
				},
				{}
			);

			set_store_value(userForm, $userForm.country = response.loc, $userForm);
		}).catch(function (error) {
			
		}); // console.log(error);

		function progressbar_currentActive_binding(value) {
			currentActive = value;
			$$invalidate(0, currentActive);
		}

		function progressbar_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				progressBar = $$value;
				$$invalidate(1, progressBar);
			});
		}

		const click_handler = () => handleProgress(+1);

		return [
			currentActive,
			progressBar,
			$processingPayment,
			bgImageUrl,
			steps,
			handleProgress,
			progressbar_currentActive_binding,
			progressbar_binding,
			click_handler
		];
	}

	class App extends SvelteComponent {
		constructor(options) {
			super();
			init(this, options, instance, create_fragment, safe_not_equal, {});
		}
	}

	var div = document.createElement('DIV');
	var script = document.currentScript;
	script.parentNode.insertBefore(div, script);

	new App({
		target: div,
		// props: { name: 'ImpactHero Shop' },
	});

})();
