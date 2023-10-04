import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import sveltePreprocess from 'svelte-preprocess';
import dotenv from "dotenv";
import replace from '@rollup/plugin-replace';

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
            __app: JSON.stringify({
              env: {
                STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
                STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
                API_END_POINT: process.env.API_END_POINT,
                ...dotenv.config().parsed
              } 
            })
        })
    ]
}