import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import sveltePreprocess from 'svelte-preprocess';
import dotenv from "dotenv";
import replace from '@rollup/plugin-replace';
import { config } from "dotenv";

dotenv.config()

export default {
    input: 'main.js',
    output: {
        format: 'iife',
        file: 'ih-shop-widget.js',
        sourcemap: false
    },
    plugins: [
        svelte({ 
            emitCss: false,
            preprocess: sveltePreprocess({
                postcss: true,  // And tells it to specifically run postcss!
            }),
        }),
        resolve({ browser: true, dedupe: ['svelte'] }),
        replace({
            values: {
                __myapp: JSON.stringify({
                    ...config().parsed
                })
            },
        }),
    ]
}