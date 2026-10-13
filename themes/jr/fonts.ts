import localFont from 'next/font/local'

export const mont = localFont({
    src: [
        {path: './fonts/Mont-Light.woff2', weight: '300', style: 'normal'},
        {path: './fonts/Mont-Regular.woff2', weight: '400', style: 'normal'},
        {path: './fonts/Mont-Bold.woff2', weight: '700', style: 'normal'},
        {path: './fonts/Mont-Heavy.woff2', weight: '800', style: 'normal'},
        {path: './fonts/Mont-Black.woff2', weight: '900', style: 'normal'},
    ],
    variable: '--font-mont',
    display: 'swap',
})
