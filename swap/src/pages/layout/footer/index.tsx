import CustomIcon from '../../../components/icon'
import styles from './index.less'

const linksData = [
  {
    url: 'https://twitter.com/mvcswap',
    icon: 'iconTwitter',
  },
  {
    url: 'https://t.me/mvcswap',
    icon: 'icontelegram',
  },
  {
    url: 'https://discord.com/invite/RGHWazu9eS',
    icon: 'icondiscord',
  },
  {
    url: 'https://github.com/mvc-swap',
    icon: 'icongithub',
  },
]

export default function Footer() {
  return (
    <section className={styles.footer}>
      <div className={styles.footer_inner}>
        <div className={styles.text_wrap}>
          <div className={styles.text}>MVCSwap © 2023</div>
        </div>
        <div className={styles.icons}>
          {linksData.map((item) => (
            <a
              key={item.icon}
              href={item.url}
              target="_blank"
              className={styles.icon}
            >
              <CustomIcon type={item.icon} />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
