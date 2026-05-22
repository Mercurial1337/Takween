'use client';

import { Search, Compass, ShieldAlert, Sparkles, Clock, Check, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './FeaturesSection.module.css';

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.badge}>Why Takween?</span>
          <h2 className={styles.title}>Designed for Team Matching</h2>
          <p className={styles.subtitle}>
            WhatsApp and university groups are messy, fast-moving, and not designed for team matching. 
            Takween brings structure, speed, and clarity to your course projects.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Card 1: Clear Team Discovery */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <Search size={20} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>1. Clear Team Discovery</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.comparison}>
                <div className={`${styles.comparisonBox} ${styles.whatsappBox}`}>
                  <span className={styles.platformLabel}>WhatsApp Group</span>
                  <p className={styles.chatMessage}>&ldquo;We need one backend developer&rdquo;</p>
                  <span className={styles.chatTime}>Buried after 2 hours...</span>
                </div>
                <div className={`${styles.comparisonBox} ${styles.takweenBox}`}>
                  <span className={styles.platformLabelTakween}>Takween</span>
                  <p className={styles.takweenMessage}>Incomplete teams stay visible, searchable, and organized.</p>
                  <span className={styles.statusLabel}>Always Active & Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Better Matching by Skills */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <Compass size={20} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>2. Better Matching by Skills</h3>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.cardDescription}>
                Instead of randomly asking in general chats, filter and discover teams instantly. Find projects needing your exact skills.
              </p>
              <div className={styles.tagsContainer}>
                <span className={styles.tag}>Project Type</span>
                <span className={styles.tag}>Needed Role</span>
                <span className={styles.tag}>Skills</span>
                <span className={styles.tag}>Department</span>
                <span className={styles.tag}>Year</span>
                <span className={styles.tag}>Available Seats</span>
              </div>
              <p className={styles.cardSubtext}>
                Whether you know <strong>UI/UX, Backend, AI, or Database</strong>, you can find teams that actually need you.
              </p>
            </div>
          </div>

          {/* Card 3: Less Spam and Confusion */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <ShieldAlert size={20} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>3. Less Spam and Confusion</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.listComparison}>
                <div className={styles.spamItem}>
                  <AlertCircle size={18} className={styles.spamIcon} />
                  <span><strong>WhatsApp:</strong> Unrelated discussions, repeated messages, announcements, jokes.</span>
                </div>
                <div className={styles.focusItem}>
                  <Check size={18} className={styles.focusIcon} />
                  <span><strong>Takween:</strong> Only teams, projects, missing roles, and students wanting to join.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: More Trust and Structure */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <Sparkles size={20} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>4. More Trust and Structure</h3>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.cardDescription}>
                No more guessing. Every team has a structured profile that makes decision making easy.
              </p>
              <div className={styles.teamMockup}>
                <div className={styles.mockupHeader}>
                  <span className={styles.mockupTitle}>Graduation Project team</span>
                  <span className={styles.mockupBadge}>Recruiting</span>
                </div>
                <div className={styles.mockupRow}>
                  <span><strong>Required Roles:</strong> UI/UX Designer</span>
                  <span><strong>Members:</strong> 3/4</span>
                </div>
                <div className={styles.mockupRow}>
                  <span><strong>Contact:</strong> WhatsApp (revealed on accept)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Saves Time */}
          <div className={`${styles.card} ${styles.fullWidthCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.iconContainer}>
                <Clock size={20} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>5. Saves Time</h3>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.timeSavings}>
                <div className={styles.timeSavingsText}>
                  <p className={styles.cardDescription}>
                    Instead of asking across 5 different groups and waiting for replies:
                  </p>
                  <p className={styles.quoteText}>&ldquo;Anyone needs a teammate?&rdquo;</p>
                  <p className={styles.cardDescription}>
                    Simply open <strong>Takween</strong> and instantly see all teams that are still incomplete and recruiting.
                  </p>
                </div>
                <div className={styles.timeSavingsVisual}>
                  <div className={styles.savingBadge}>
                    <RefreshCw size={24} className={styles.savingIcon} />
                    <span>Instant Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
