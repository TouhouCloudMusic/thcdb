import { createSignal, For } from "solid-js";

type NavItem = {
    id: string;
    label: string;
    active?: boolean;
};

export function Navbar() {
    const [items, setItems] = createSignal<NavItem[]>([
        { id: "recommend", label: "推荐", active: true },
        { id: "playlist", label: "歌单" },
        { id: "rank", label: "排行榜" },
        { id: "artist", label: "歌手" },
        { id: "album", label: "专辑" },
        { id: "doujin", label: "同人社团" },
        { id: "video", label: "视频" },
        { id: "article", label: "文章" },
        { id: "event", label: "活动" },
    ]);

    const setActive = (id: string) => {
        setItems(prev => prev.map(item => ({
            ...item,
            active: item.id === id
        })));
    };

    return (
        <div class="bg-white sticky top-0 z-10 shadow-sm">
            <div class="flex items-center space-x-6 px-6 overflow-x-auto hide-scrollbar">
                <For each={items()}>
                    {(item) => (
                        <button
                            class={`py-4 relative text-sm font-medium transition-colors whitespace-nowrap
                ${item.active
                                    ? 'text-rose-600'
                                    : 'text-gray-600 hover:text-gray-900'}`}
                            onClick={() => setActive(item.id)}
                        >
                            {item.label}
                            {item.active && (
                                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full"></div>
                            )}
                        </button>
                    )}
                </For>
            </div>
        </div>
    );
} 