import './ocr.worker'
import './index.worker'
import './drive.worker'
import './mail.worker'
import { registerCron } from './cron'

registerCron().catch((err) => {
  console.error('[workers] Failed to register cron:', err)
})

console.log('workers up')
