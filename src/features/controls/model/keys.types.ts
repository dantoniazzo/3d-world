export interface KeyConfig {
  name: string;
  keys: string[];
}

export interface Keys {
  forward?: KeyConfig;
  back?: KeyConfig;
  left?: KeyConfig;
  right?: KeyConfig;
  brake?: KeyConfig;
  jump?: KeyConfig;
  shift?: KeyConfig;
  reset?: KeyConfig;
}
