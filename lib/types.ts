/**
 * Catchup types supported by IPTV providers
 * - default: Uses catchup-source URL template
 * - append: Appends query params to live URL
 * - shift: Uses timeshift parameter
 * - flussonic: Flussonic server format
 * - xc: Xtream Codes format
 */
export type CatchupType = "default" | "append" | "shift" | "flussonic" | "xc" | "fs" | "vod";

export interface CatchupInfo {
  type: CatchupType;
  days: number; // Number of days available for catchup
  source?: string; // URL template for catchup streams
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
  tvgId?: string;
  tvgName?: string;
  tvgChno?: number; // Channel number from playlist
  isFavorite: boolean;
  isHidden: boolean;
  order: number;
  // Catchup/Timeshift support
  catchup?: CatchupInfo;
  // VOD detection
  isVod?: boolean;
  vodType?: "movie" | "series" | "episode";
  seriesInfo?: {
    name: string;
    season?: number;
    episode?: number;
  };
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: Channel[];
  createdAt: number;
  updatedAt: number;
  lastRefreshed?: number;
  autoRefreshEnabled?: boolean;
  autoRefreshInterval?: number; // in minutes, default 60
}

export interface RefreshResult {
  added: number;
  removed: number;
  total: number;
  errors: string[];
}

export interface PlaylistStore {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentChannel: Channel | null;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  addPlaylist: (url: string, name?: string) => Promise<void>;
  addPlaylistFromFile: (file: File, name?: string) => Promise<void>;
  removePlaylist: (id: string) => void;
  refreshPlaylist: (playlistId: string) => Promise<RefreshResult>;
  updatePlaylistSettings: (playlistId: string, settings: Partial<Playlist>) => void;
  setCurrentChannel: (channel: Channel) => void;
  toggleFavorite: (channelId: string) => void;
  toggleHidden: (channelId: string) => void;
  updateChannelOrder: (channelId: string, newOrder: number) => void;
  searchChannels: (query: string) => Channel[];
  getVisibleChannels: () => Channel[];
  getFavoriteChannels: () => Channel[];
}
