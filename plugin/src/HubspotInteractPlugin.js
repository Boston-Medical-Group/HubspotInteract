import React from 'react';
import { FlexPlugin } from '@twilio/flex-plugin';

import InteractionCard from './components/InteractionCard/InteractionCard';

const PLUGIN_NAME = 'HubspotInteractPlugin';

export default class HubspotInteractPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   */
  async init(flex, manager) {
    const options = { sortOrder: 1000 };

    flex.NoTasksCanvas.Content.add(<InteractionCard key="HubspotInteractPlugin-component" manager={manager} />, options);

    

    

  }
}
