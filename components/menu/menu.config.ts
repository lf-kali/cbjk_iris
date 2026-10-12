
export interface MenuComponent {
    title: string;
    path?: string;
    children?: MenuComponent[];
}

export const mainMenu: MenuComponent[] = [
    {
        title: "Início",
        path: "/",
    },

    {
        title: "Nossos Produtos",
        path: "/produtos",
    },
    {
        title: "Nossos Serviços",
        path: "/servicos"
    },
    {
        title: "Últimos Projetos",
        path: "/ultimos-projetos",
    },
];