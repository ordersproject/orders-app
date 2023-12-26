'use strict'
import React, { Component } from 'react'
import { Button } from 'antd'
import Layout from '../layout'
import Nav from '../layout/nav'
import Footer from '../layout/footer'

// import Notice from '../components/notice'
import styles from './index.less'
import _ from 'i18n'

import homeLogo from '/home.png'
import homeLine from '/home_line.png'
import securityLogo from '/security.png'
import scalabilityLogo from '/scalability.png'
import speedLogo from '/speed.png'
import { FiArrowUpRight } from 'react-icons/fi'
import cls from 'classnames'
import Notice from '../../components/notice'

export default class Home extends Component {
  render() {
    return (
      <Layout>
        <Notice />
        <section className={styles.container}>
          <nav className={styles.head}>
            <div className={styles.head_inner}>
              <Nav />
              <div className={styles.head_right}>
                <Button
                  type="primary"
                  className={styles.cta}
                  shape="default"
                  // onClick={() => {
                  //   history.push('swap')
                  // }}
                >
                  {_('launch_app')}
                </Button>
              </div>
            </div>
          </nav>
          <section className={styles.main}>
            <div className={styles.main_left}>
              <div className={styles.main_title}>{_('mvcswap')}</div>
              <div className={styles.main_desc}>{_('mvcswap_desc')}</div>

              <div className={styles.btns}>
                <button
                  // type="primary"
                  className={styles.btn_start}
                  // shape="default"
                  onClick={() => {
                    // history.push('swap')
                  }}
                >
                  {_('launch_app')}
                  <FiArrowUpRight className={styles.btn_start_arrow} />
                </button>
                <button
                  className={styles.btn_doc}
                  onClick={() => {
                    window.location.href = 'https://docs.mvcswap.com/'
                  }}
                  // data={_('documentation')}
                >
                  <svg width="0" height="0">
                    <linearGradient
                      id="blue-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop stopColor="#72f5f6" offset="0%" />
                      <stop stopColor="#171aff" offset="100%" />
                    </linearGradient>
                  </svg>
                  <FiArrowUpRight
                    className={styles.btn_doc_arrow}
                    style={{ stroke: 'url(#blue-gradient)' }}
                  />
                </button>
              </div>

              <img
                src={homeLine}
                alt="Home Line"
                className={styles.main_line}
              />
            </div>

            <img
              src={homeLogo}
              alt="Home Icon"
              className={cls(styles.hidden_mobile, styles.main_intro)}
            />
          </section>

          <section className={styles.content}>
            <div className={styles.title_web}>{_('feature')}</div>
            <div className={styles.title_h5}>{_('feature_h5')}</div>
            {/* Add the new feature section */}
            <section className={styles.features}>
              <div className={styles.feature}>
                <img
                  src={securityLogo}
                  alt="security Icon"
                  className={styles.feature_icon}
                />
                <div className={styles.feature_title}>
                  {_('feature_security')}
                </div>
                <div className={styles.feature_content}>
                  {_('security_desc')}
                </div>
              </div>
              <div className={styles.feature}>
                <img
                  src={scalabilityLogo}
                  alt="scalability Icon"
                  className={styles.feature_icon}
                />
                <div className={styles.feature_title}>
                  {_('feature_scalability')}
                </div>
                <div className={styles.feature_content}>
                  {_('scalability_desc')}
                </div>
              </div>
              <div className={styles.feature}>
                <img
                  src={speedLogo}
                  alt="Speed Icon"
                  className={styles.feature_icon}
                />
                <div className={styles.feature_title}>{_('feature_speed')}</div>
                <div className={styles.feature_content}>{_('speed_desc')}</div>
              </div>
            </section>
          </section>
        </section>
        <Footer />
      </Layout>
    )
  }
}
