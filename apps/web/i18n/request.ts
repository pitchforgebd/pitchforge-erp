import { getRequestConfig } from 'next-intl/server';

import messages from '../messages/en.json';

// English now, Bangla later: a second locale means a second messages file, not a code change.
export default getRequestConfig(() => ({
  locale: 'en',
  timeZone: 'Asia/Dhaka',
  messages,
}));
