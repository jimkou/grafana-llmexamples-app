import { PanelPlugin } from '@grafana/data';
import { GptPanel } from './panel';

export const plugin = new PanelPlugin(GptPanel);
