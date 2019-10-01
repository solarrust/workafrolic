
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(html, anchor = null) {
            this.e = element('div');
            this.a = anchor;
            this.u(html);
        }
        m(target, anchor = null) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(target, this.n[i], anchor);
            }
            this.t = target;
        }
        u(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        p(html) {
            this.d();
            this.u(html);
            this.m(this.t, this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Logo/Logo.svelte generated by Svelte v3.12.1 */

    const file = "src/Logo/Logo.svelte";

    function create_fragment(ctx) {
    	var a;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Logo";
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "logo header__logo");
    			add_location(a, file, 11, 0, 216);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self) {
    	onMount(async () => {
    		let logoEl = document.querySelector('.logo');
    		if (window.location.pathname == '/') {
    		 	logoEl.classList.add('_disabled');
    		}
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return {};
    }

    class Logo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Logo", options, id: create_fragment.name });
    	}
    }

    /* src/Nav/Nav.svelte generated by Svelte v3.12.1 */

    const file$1 = "src/Nav/Nav.svelte";

    function create_fragment$1(ctx) {
    	var div, t0, nav, a0, t2, a1, t4, a2, current;

    	var logo = new Logo({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			logo.$$.fragment.c();
    			t0 = space();
    			nav = element("nav");
    			a0 = element("a");
    			a0.textContent = "Главная";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "Блог";
    			t4 = space();
    			a2 = element("a");
    			a2.textContent = "Эбаут";
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "nav__link link");
    			add_location(a0, file$1, 7, 2, 121);
    			attr_dev(a1, "href", "/");
    			attr_dev(a1, "class", "nav__link link");
    			add_location(a1, file$1, 8, 2, 170);
    			attr_dev(a2, "href", "/");
    			attr_dev(a2, "class", "nav__link link");
    			add_location(a2, file$1, 9, 2, 216);
    			attr_dev(nav, "class", "nav header__nav");
    			add_location(nav, file$1, 6, 1, 89);
    			attr_dev(div, "class", "row");
    			add_location(div, file$1, 4, 0, 61);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(logo, div, null);
    			append_dev(div, t0);
    			append_dev(div, nav);
    			append_dev(nav, a0);
    			append_dev(nav, t2);
    			append_dev(nav, a1);
    			append_dev(nav, t4);
    			append_dev(nav, a2);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(logo.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(logo.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			destroy_component(logo);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Nav", options, id: create_fragment$1.name });
    	}
    }

    /* src/Header/Header.svelte generated by Svelte v3.12.1 */

    const file$2 = "src/Header/Header.svelte";

    function create_fragment$2(ctx) {
    	var header, t, h1, current;

    	var nav = new Nav({ $$inline: true });

    	const block = {
    		c: function create() {
    			header = element("header");
    			nav.$$.fragment.c();
    			t = space();
    			h1 = element("h1");
    			h1.textContent = "О технологиях на русском";
    			attr_dev(h1, "class", "header__title");
    			add_location(h1, file$2, 6, 1, 91);
    			attr_dev(header, "class", "header");
    			add_location(header, file$2, 4, 0, 58);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			mount_component(nav, header, null);
    			append_dev(header, t);
    			append_dev(header, h1);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(header);
    			}

    			destroy_component(nav);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Header", options, id: create_fragment$2.name });
    	}
    }

    /* src/Summary/Summary.svelte generated by Svelte v3.12.1 */

    const file$3 = "src/Summary/Summary.svelte";

    function create_fragment$3(ctx) {
    	var article, span, t0_value = ctx.i + ctx.offset + 1 + "", t0, t1, h2, a0, t2_value = ctx.item.title + "", t2, a0_href_value, t3, p, a1, t4_value = ctx.comment_text() + "", t4, a1_href_value, t5, t6_value = ctx.item.user + "", t6, t7, t8_value = ctx.item.time_ago + "", t8;

    	const block = {
    		c: function create() {
    			article = element("article");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			h2 = element("h2");
    			a0 = element("a");
    			t2 = text(t2_value);
    			t3 = space();
    			p = element("p");
    			a1 = element("a");
    			t4 = text(t4_value);
    			t5 = text(" by ");
    			t6 = text(t6_value);
    			t7 = space();
    			t8 = text(t8_value);
    			attr_dev(span, "class", "svelte-iq2nst");
    			add_location(span, file$3, 34, 1, 426);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", a0_href_value = ctx.item.url);
    			attr_dev(a0, "class", "svelte-iq2nst");
    			add_location(a0, file$3, 35, 5, 461);
    			attr_dev(h2, "class", "svelte-iq2nst");
    			add_location(h2, file$3, 35, 1, 457);
    			attr_dev(a1, "href", a1_href_value = "#/item/" + ctx.item.id);
    			attr_dev(a1, "class", "svelte-iq2nst");
    			add_location(a1, file$3, 36, 17, 535);
    			attr_dev(p, "class", "meta");
    			add_location(p, file$3, 36, 1, 519);
    			attr_dev(article, "class", "svelte-iq2nst");
    			add_location(article, file$3, 33, 0, 415);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, span);
    			append_dev(span, t0);
    			append_dev(article, t1);
    			append_dev(article, h2);
    			append_dev(h2, a0);
    			append_dev(a0, t2);
    			append_dev(article, t3);
    			append_dev(article, p);
    			append_dev(p, a1);
    			append_dev(a1, t4);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.i || changed.offset) && t0_value !== (t0_value = ctx.i + ctx.offset + 1 + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((changed.item) && t2_value !== (t2_value = ctx.item.title + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((changed.item) && a0_href_value !== (a0_href_value = ctx.item.url)) {
    				attr_dev(a0, "href", a0_href_value);
    			}

    			if ((changed.item) && a1_href_value !== (a1_href_value = "#/item/" + ctx.item.id)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if ((changed.item) && t6_value !== (t6_value = ctx.item.user + "")) {
    				set_data_dev(t6, t6_value);
    			}

    			if ((changed.item) && t8_value !== (t8_value = ctx.item.time_ago + "")) {
    				set_data_dev(t8, t8_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { item, i, offset } = $$props;

    	function comment_text() {
    		const c = item.comments_count;
    		return `${c} ${c === 1 ? 'comment' : 'comments'}`;
    	}

    	const writable_props = ['item', 'i', 'offset'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Summary> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('i' in $$props) $$invalidate('i', i = $$props.i);
    		if ('offset' in $$props) $$invalidate('offset', offset = $$props.offset);
    	};

    	$$self.$capture_state = () => {
    		return { item, i, offset };
    	};

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('i' in $$props) $$invalidate('i', i = $$props.i);
    		if ('offset' in $$props) $$invalidate('offset', offset = $$props.offset);
    	};

    	return { item, i, offset, comment_text };
    }

    class Summary extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, ["item", "i", "offset"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Summary", options, id: create_fragment$3.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.item === undefined && !('item' in props)) {
    			console.warn("<Summary> was created without expected prop 'item'");
    		}
    		if (ctx.i === undefined && !('i' in props)) {
    			console.warn("<Summary> was created without expected prop 'i'");
    		}
    		if (ctx.offset === undefined && !('offset' in props)) {
    			console.warn("<Summary> was created without expected prop 'offset'");
    		}
    	}

    	get item() {
    		throw new Error("<Summary>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Summary>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get i() {
    		throw new Error("<Summary>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set i(value) {
    		throw new Error("<Summary>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get offset() {
    		throw new Error("<Summary>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set offset(value) {
    		throw new Error("<Summary>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/List/List.svelte generated by Svelte v3.12.1 */

    const file$4 = "src/List/List.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (44:0) {:else}
    function create_else_block(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "loading...";
    			attr_dev(p, "class", "loading svelte-1gm06r8");
    			add_location(p, file$4, 44, 1, 709);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(44:0) {:else}", ctx });
    	return block;
    }

    // (38:0) {#if items}
    function create_if_block(ctx) {
    	var t0, a, t1, t2_value = ctx.page + 1 + "", t2, a_href_value, current;

    	let each_value = ctx.items;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			a = element("a");
    			t1 = text("page ");
    			t2 = text(t2_value);
    			attr_dev(a, "href", a_href_value = "#/top/" + (ctx.page + 1));
    			attr_dev(a, "class", "svelte-1gm06r8");
    			add_location(a, file$4, 42, 1, 653);
    		},

    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.items || changed.offset) {
    				each_value = ctx.items;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}

    			if ((!current || changed.page) && t2_value !== (t2_value = ctx.page + 1 + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.page) && a_href_value !== (a_href_value = "#/top/" + (ctx.page + 1))) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(a);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(38:0) {#if items}", ctx });
    	return block;
    }

    // (39:1) {#each items as item, i}
    function create_each_block(ctx) {
    	var current;

    	var summary = new Summary({
    		props: {
    		item: ctx.item,
    		i: ctx.i,
    		offset: ctx.offset
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			summary.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(summary, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var summary_changes = {};
    			if (changed.items) summary_changes.item = ctx.item;
    			if (changed.offset) summary_changes.offset = ctx.offset;
    			summary.$set(summary_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(summary.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(summary.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(summary, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(39:1) {#each items as item, i}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.items) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
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
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    const PAGE_SIZE = 20;

    function instance$2($$self, $$props, $$invalidate) {
    	

    	let { page } = $$props;

    	let items;
    	let offset;

    	const writable_props = ['page'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    	};

    	$$self.$capture_state = () => {
    		return { page, items, offset };
    	};

    	$$self.$inject_state = $$props => {
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('items' in $$props) $$invalidate('items', items = $$props.items);
    		if ('offset' in $$props) $$invalidate('offset', offset = $$props.offset);
    	};

    	$$self.$$.update = ($$dirty = { page: 1 }) => {
    		if ($$dirty.page) { fetch(`https://node-hnapi.herokuapp.com/news?page=${page}`)
    				.then(r => r.json())
    				.then(data => {
    					$$invalidate('items', items = data);
    					$$invalidate('offset', offset = PAGE_SIZE * (page - 1));
    					window.scrollTo(0, 0);
    				}); }
    	};

    	return { page, items, offset };
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, ["page"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "List", options, id: create_fragment$4.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.page === undefined && !('page' in props)) {
    			console.warn("<List> was created without expected prop 'page'");
    		}
    	}

    	get page() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set page(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Comment/Comment.svelte generated by Svelte v3.12.1 */

    const file$5 = "src/Comment/Comment.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.child = list[i];
    	return child_ctx;
    }

    // (28:2) {#each comment.comments as child}
    function create_each_block$1(ctx) {
    	var current;

    	var comment_1 = new Comment({
    		props: { comment: ctx.child },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			comment_1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(comment_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var comment_1_changes = {};
    			if (changed.comment) comment_1_changes.comment = ctx.child;
    			comment_1.$set(comment_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(comment_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(comment_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(comment_1, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$1.name, type: "each", source: "(28:2) {#each comment.comments as child}", ctx });
    	return block;
    }

    function create_fragment$5(ctx) {
    	var article, p, t0_value = ctx.comment.user + "", t0, t1, t2_value = ctx.comment.time_ago + "", t2, t3, html_tag, raw_value = ctx.comment.content + "", t4, div, current;

    	let each_value = ctx.comment.comments;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			article = element("article");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(p, "class", "meta svelte-1v1ma1k");
    			add_location(p, file$5, 22, 1, 242);
    			html_tag = new HtmlTag(raw_value, t4);
    			attr_dev(div, "class", "replies svelte-1v1ma1k");
    			add_location(div, file$5, 26, 1, 324);
    			attr_dev(article, "class", "svelte-1v1ma1k");
    			add_location(article, file$5, 21, 0, 231);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(article, t3);
    			html_tag.m(article);
    			append_dev(article, t4);
    			append_dev(article, div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.comment) && t0_value !== (t0_value = ctx.comment.user + "")) {
    				set_data_dev(t0, t0_value);
    			}

    			if ((!current || changed.comment) && t2_value !== (t2_value = ctx.comment.time_ago + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.comment) && raw_value !== (raw_value = ctx.comment.content + "")) {
    				html_tag.p(raw_value);
    			}

    			if (changed.comment) {
    				each_value = ctx.comment.comments;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(article);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { comment } = $$props;

    	const writable_props = ['comment'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Comment> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('comment' in $$props) $$invalidate('comment', comment = $$props.comment);
    	};

    	$$self.$capture_state = () => {
    		return { comment };
    	};

    	$$self.$inject_state = $$props => {
    		if ('comment' in $$props) $$invalidate('comment', comment = $$props.comment);
    	};

    	return { comment };
    }

    class Comment extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$5, safe_not_equal, ["comment"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Comment", options, id: create_fragment$5.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.comment === undefined && !('comment' in props)) {
    			console.warn("<Comment> was created without expected prop 'comment'");
    		}
    	}

    	get comment() {
    		throw new Error("<Comment>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set comment(value) {
    		throw new Error("<Comment>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Item/Item.svelte generated by Svelte v3.12.1 */

    const file$6 = "src/Item/Item.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.comment = list[i];
    	return child_ctx;
    }

    // (36:1) {#each item.comments as comment}
    function create_each_block$2(ctx) {
    	var current;

    	var comment = new Comment({
    		props: { comment: ctx.comment },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			comment.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(comment, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var comment_changes = {};
    			if (changed.item) comment_changes.comment = ctx.comment;
    			comment.$set(comment_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(comment.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(comment.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(comment, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block$2.name, type: "each", source: "(36:1) {#each item.comments as comment}", ctx });
    	return block;
    }

    function create_fragment$6(ctx) {
    	var a0, t0, t1, article, a1, h1, t2_value = ctx.item.title + "", t2, t3, small, t4_value = ctx.item.domain + "", t4, a1_href_value, t5, p, t6, t7_value = ctx.item.user + "", t7, t8, t9_value = ctx.item.time_ago + "", t9, t10, div, current;

    	let each_value = ctx.item.comments;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			t0 = text("« back");
    			t1 = space();
    			article = element("article");
    			a1 = element("a");
    			h1 = element("h1");
    			t2 = text(t2_value);
    			t3 = space();
    			small = element("small");
    			t4 = text(t4_value);
    			t5 = space();
    			p = element("p");
    			t6 = text("submitted by ");
    			t7 = text(t7_value);
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			attr_dev(a0, "href", ctx.returnTo);
    			attr_dev(a0, "class", "svelte-106zs3f");
    			add_location(a0, file$6, 23, 0, 255);
    			attr_dev(h1, "class", "svelte-106zs3f");
    			add_location(h1, file$6, 27, 2, 327);
    			add_location(small, file$6, 28, 2, 351);
    			attr_dev(a1, "href", a1_href_value = ctx.item.url);
    			attr_dev(a1, "class", "svelte-106zs3f");
    			add_location(a1, file$6, 26, 1, 303);
    			attr_dev(p, "class", "meta");
    			add_location(p, file$6, 31, 1, 388);
    			attr_dev(article, "class", "svelte-106zs3f");
    			add_location(article, file$6, 25, 0, 292);
    			attr_dev(div, "class", "comments");
    			add_location(div, file$6, 34, 0, 457);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			append_dev(a0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, article, anchor);
    			append_dev(article, a1);
    			append_dev(a1, h1);
    			append_dev(h1, t2);
    			append_dev(a1, t3);
    			append_dev(a1, small);
    			append_dev(small, t4);
    			append_dev(article, t5);
    			append_dev(article, p);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			append_dev(p, t8);
    			append_dev(p, t9);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.returnTo) {
    				attr_dev(a0, "href", ctx.returnTo);
    			}

    			if ((!current || changed.item) && t2_value !== (t2_value = ctx.item.title + "")) {
    				set_data_dev(t2, t2_value);
    			}

    			if ((!current || changed.item) && t4_value !== (t4_value = ctx.item.domain + "")) {
    				set_data_dev(t4, t4_value);
    			}

    			if ((!current || changed.item) && a1_href_value !== (a1_href_value = ctx.item.url)) {
    				attr_dev(a1, "href", a1_href_value);
    			}

    			if ((!current || changed.item) && t7_value !== (t7_value = ctx.item.user + "")) {
    				set_data_dev(t7, t7_value);
    			}

    			if ((!current || changed.item) && t9_value !== (t9_value = ctx.item.time_ago + "")) {
    				set_data_dev(t9, t9_value);
    			}

    			if (changed.item) {
    				each_value = ctx.item.comments;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a0);
    				detach_dev(t1);
    				detach_dev(article);
    				detach_dev(t10);
    				detach_dev(div);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { item, returnTo } = $$props;

    	const writable_props = ['item', 'returnTo'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Item> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('returnTo' in $$props) $$invalidate('returnTo', returnTo = $$props.returnTo);
    	};

    	$$self.$capture_state = () => {
    		return { item, returnTo };
    	};

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('returnTo' in $$props) $$invalidate('returnTo', returnTo = $$props.returnTo);
    	};

    	return { item, returnTo };
    }

    class Item extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$6, safe_not_equal, ["item", "returnTo"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Item", options, id: create_fragment$6.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.item === undefined && !('item' in props)) {
    			console.warn("<Item> was created without expected prop 'item'");
    		}
    		if (ctx.returnTo === undefined && !('returnTo' in props)) {
    			console.warn("<Item> was created without expected prop 'returnTo'");
    		}
    	}

    	get item() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get returnTo() {
    		throw new Error("<Item>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set returnTo(value) {
    		throw new Error("<Item>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/BlogList/BlogList.svelte generated by Svelte v3.12.1 */
    const { window: window_1 } = globals;

    const file$7 = "src/BlogList/BlogList.svelte";

    // (34:16) 
    function create_if_block_1(ctx) {
    	var current;

    	var list = new List({
    		props: { page: ctx.page },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			list.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var list_changes = {};
    			if (changed.page) list_changes.page = ctx.page;
    			list.$set(list_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(34:16) ", ctx });
    	return block;
    }

    // (32:1) {#if item}
    function create_if_block$1(ctx) {
    	var current;

    	var item_1 = new Item({
    		props: {
    		item: ctx.item,
    		returnTo: "#/top/" + ctx.page
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			item_1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(item_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var item_1_changes = {};
    			if (changed.item) item_1_changes.item = ctx.item;
    			if (changed.page) item_1_changes.returnTo = "#/top/" + ctx.page;
    			item_1.$set(item_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(item_1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(item_1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(item_1, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(32:1) {#if item}", ctx });
    	return block;
    }

    function create_fragment$7(ctx) {
    	var section, current_block_type_index, if_block, current, dispose;

    	var if_block_creators = [
    		create_if_block$1,
    		create_if_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.item) return 0;
    		if (ctx.page) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(null, ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			attr_dev(section, "class", "blog-list");
    			add_location(section, file$7, 30, 0, 650);
    			dispose = listen_dev(window_1, "hashchange", ctx.hashchange);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (~current_block_type_index) if_blocks[current_block_type_index].m(section, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				if (if_block) {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(section, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(section);
    			}

    			if (~current_block_type_index) if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	

    	let item;
    	let page;

    	async function hashchange() {
    		// the poor man's router!
    		const path = window.location.hash.slice(1);

    		if (path.startsWith('/item')) {
    			const id = path.slice(6);
    			$$invalidate('item', item = await fetch(`https://node-hnapi.herokuapp.com/item/${id}`).then(r => r.json()));

    			window.scrollTo(0,0);
    		} else if (path.startsWith('/top')) {
    			$$invalidate('page', page = +path.slice(5));
    			$$invalidate('item', item = null);
    		} else {
    			window.location.hash = '/top/1';
    		}
    	}

    	onMount(hashchange);

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate('item', item = $$props.item);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    	};

    	return { item, page, hashchange };
    }

    class BlogList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "BlogList", options, id: create_fragment$7.name });
    	}
    }

    /* src/Footer/Footer.svelte generated by Svelte v3.12.1 */

    const file$8 = "src/Footer/Footer.svelte";

    function create_fragment$8(ctx) {
    	var footer;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			footer.textContent = "Footer";
    			attr_dev(footer, "class", "footer");
    			add_location(footer, file$8, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(footer);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Footer", options, id: create_fragment$8.name });
    	}
    }

    /* src/App.svelte generated by Svelte v3.12.1 */

    const file$9 = "src/App.svelte";

    function create_fragment$9(ctx) {
    	var t0, main, t1, current;

    	var header = new Header({ $$inline: true });

    	var bloglist = new BlogList({ $$inline: true });

    	var footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			header.$$.fragment.c();
    			t0 = space();
    			main = element("main");
    			bloglist.$$.fragment.c();
    			t1 = space();
    			footer.$$.fragment.c();
    			attr_dev(main, "class", "main");
    			add_location(main, file$9, 8, 0, 195);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(header, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(bloglist, main, null);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);

    			transition_in(bloglist.$$.fragment, local);

    			transition_in(footer.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(bloglist.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(header, detaching);

    			if (detaching) {
    				detach_dev(t0);
    				detach_dev(main);
    			}

    			destroy_component(bloglist);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(footer, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$9.name });
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
