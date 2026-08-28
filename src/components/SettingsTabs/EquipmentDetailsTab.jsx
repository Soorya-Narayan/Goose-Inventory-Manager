// src/components/SettingsTabs/EquipmentDetailsTab.jsx
import React from 'react';
import styles from './EquipmentDetailsTab.module.css';

const EquipmentDetailsTab = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2><i className="fa-solid fa-industry" /> CIP System Specifications</h2>
                <p>High-grade materials and precision engineering for pharmaceutical-grade cleaning</p>
            </div>

            {/* Materials Section */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-layer-group" /> Material Construction
                </h3>
                <div className={styles.cardGrid}>
                    <div className={`${styles.materialCard} ${styles.card3d}`}>
                        <div className={styles.cardIcon}>
                            <i className="fa-solid fa-flask" />
                        </div>
                        <h4>Contact Parts</h4>
                        <div className={styles.materialBadge}>AISI 316L</div>
                        <p>Premium stainless steel with superior corrosion resistance for direct product contact surfaces.</p>
                        <div className={styles.specs}>
                            <span><i className="fa-solid fa-shield-halved" /> Food Grade</span>
                            <span><i className="fa-solid fa-droplet" /> Anti-Corrosive</span>
                        </div>
                    </div>

                    <div className={`${styles.materialCard} ${styles.card3d}`}>
                        <div className={styles.cardIcon}>
                            <i className="fa-solid fa-cube" />
                        </div>
                        <h4>Structural Parts</h4>
                        <div className={styles.materialBadge}>AISI 304</div>
                        <p>High-quality stainless steel for non-contact structural components and framework.</p>
                        <div className={styles.specs}>
                            <span><i className="fa-solid fa-hammer" /> Durable</span>
                            <span><i className="fa-solid fa-wrench" /> Low Maintenance</span>
                        </div>
                    </div>

                    <div className={`${styles.materialCard} ${styles.card3d}`}>
                        <div className={styles.cardIcon}>
                            <i className="fa-solid fa-gem" />
                        </div>
                        <h4>Surface Finish</h4>
                        <div className={styles.materialBadge}>Ra &lt; 0.8 µm</div>
                        <p>Electro-polished internal surfaces ensuring smooth flow and minimal bacterial adhesion.</p>
                        <div className={styles.specs}>
                            <span><i className="fa-solid fa-sparkles" /> Mirror Finish</span>
                            <span><i className="fa-solid fa-bacteria" /> Hygienic</span>
                        </div>
                    </div>

                    <div className={`${styles.materialCard} ${styles.card3d}`}>
                        <div className={styles.cardIcon}>
                            <i className="fa-solid fa-ring" />
                        </div>
                        <h4>Seals & Gaskets</h4>
                        <div className={styles.materialBadge}>EPDM / Viton</div>
                        <p>FDA-approved elastomers with excellent chemical resistance and temperature stability.</p>
                        <div className={styles.specs}>
                            <span><i className="fa-solid fa-certificate" /> FDA Approved</span>
                            <span><i className="fa-solid fa-temperature-high" /> Heat Resistant</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tanks Section */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-database" /> Storage Tank Capacities
                </h3>
                <div className={styles.tankGrid}>
                    <div className={`${styles.tankCard} ${styles.causticTank}`}>
                        <div className={styles.tankVisual}>
                            <div className={styles.tank3d}>
                                <div className={styles.tankTop}></div>
                                <div className={styles.tankBody}>
                                    <div className={styles.liquidLevel} style={{ height: '75%' }}></div>
                                </div>
                                <div className={styles.tankBottom}></div>
                            </div>
                        </div>
                        <div className={styles.tankInfo}>
                            <h4><i className="fa-solid fa-fire" /> Caustic Tank</h4>
                            <div className={styles.capacity}>2,500 L</div>
                            <ul>
                                <li><i className="fa-solid fa-temperature-arrow-up" /> Insulated Construction</li>
                                <li><i className="fa-solid fa-gauge" /> 80°C Operating Temp</li>
                                <li><i className="fa-solid fa-shield" /> Double-wall Design</li>
                            </ul>
                        </div>
                    </div>

                    <div className={`${styles.tankCard} ${styles.acidTank}`}>
                        <div className={styles.tankVisual}>
                            <div className={styles.tank3d}>
                                <div className={styles.tankTop}></div>
                                <div className={styles.tankBody}>
                                    <div className={styles.liquidLevel} style={{ height: '60%' }}></div>
                                </div>
                                <div className={styles.tankBottom}></div>
                            </div>
                        </div>
                        <div className={styles.tankInfo}>
                            <h4><i className="fa-solid fa-flask-vial" /> Acid Tank</h4>
                            <div className={styles.capacity}>2,000 L</div>
                            <ul>
                                <li><i className="fa-solid fa-skull-crossbones" /> Corrosion Resistant</li>
                                <li><i className="fa-solid fa-wind" /> Vented Design</li>
                                <li><i className="fa-solid fa-droplet" /> pH Neutral Rinse</li>
                            </ul>
                        </div>
                    </div>

                    <div className={`${styles.tankCard} ${styles.recoveryTank}`}>
                        <div className={styles.tankVisual}>
                            <div className={styles.tank3d}>
                                <div className={styles.tankTop}></div>
                                <div className={styles.tankBody}>
                                    <div className={styles.liquidLevel} style={{ height: '85%' }}></div>
                                </div>
                                <div className={styles.tankBottom}></div>
                            </div>
                        </div>
                        <div className={styles.tankInfo}>
                            <h4><i className="fa-solid fa-recycle" /> Recovery Tank</h4>
                            <div className={styles.capacity}>3,000 L</div>
                            <ul>
                                <li><i className="fa-solid fa-arrows-rotate" /> Water Reclamation</li>
                                <li><i className="fa-solid fa-filter" /> Pre-filtration System</li>
                                <li><i className="fa-solid fa-leaf" /> Eco-Friendly</li>
                            </ul>
                        </div>
                    </div>

                    <div className={`${styles.tankCard} ${styles.freshTank}`}>
                        <div className={styles.tankVisual}>
                            <div className={styles.tank3d}>
                                <div className={styles.tankTop}></div>
                                <div className={styles.tankBody}>
                                    <div className={styles.liquidLevel} style={{ height: '90%' }}></div>
                                </div>
                                <div className={styles.tankBottom}></div>
                            </div>
                        </div>
                        <div className={styles.tankInfo}>
                            <h4><i className="fa-solid fa-tint" /> Fresh Water Tank</h4>
                            <div className={styles.capacity}>5,000 L</div>
                            <ul>
                                <li><i className="fa-solid fa-water" /> RO Treated Water</li>
                                <li><i className="fa-solid fa-microscope" /> &lt; 5 µS/cm Conductivity</li>
                                <li><i className="fa-solid fa-star" /> Pharmaceutical Grade</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Components Section */}
            <section className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-gears" /> Critical Components
                </h3>
                <div className={styles.componentGrid}>
                    <div className={styles.componentCard}>
                        <div className={styles.componentIcon}>
                            <i className="fa-solid fa-fan" />
                        </div>
                        <h4>Supply Pump</h4>
                        <p className={styles.model}>Hyginox SE-28 Centrifugal</p>
                        <div className={styles.componentSpecs}>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Power</span>
                                <span className={styles.specValue}>7.5 kW</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Flow</span>
                                <span className={styles.specValue}>150 L/min</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Pressure</span>
                                <span className={styles.specValue}>5.5 bar</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.componentCard}>
                        <div className={styles.componentIcon}>
                            <i className="fa-solid fa-rotate" />
                        </div>
                        <h4>Return Pump</h4>
                        <p className={styles.model}>Self-Priming Liquid Ring</p>
                        <div className={styles.componentSpecs}>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Power</span>
                                <span className={styles.specValue}>4.0 kW</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Flow</span>
                                <span className={styles.specValue}>120 L/min</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Suction</span>
                                <span className={styles.specValue}>-0.8 bar</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.componentCard}>
                        <div className={styles.componentIcon}>
                            <i className="fa-solid fa-fire-burner" />
                        </div>
                        <h4>Heat Exchanger</h4>
                        <p className={styles.model}>Tubular Shell & Tube</p>
                        <div className={styles.componentSpecs}>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Type</span>
                                <span className={styles.specValue}>Steam</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Capacity</span>
                                <span className={styles.specValue}>45 kW</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Range</span>
                                <span className={styles.specValue}>20-85°C</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.componentCard}>
                        <div className={styles.componentIcon}>
                            <i className="fa-solid fa-valve" />
                        </div>
                        <h4>Control Valves</h4>
                        <p className={styles.model}>Pneumatic Butterfly & Seat</p>
                        <div className={styles.componentSpecs}>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Size</span>
                                <span className={styles.specValue}>DN50-DN65</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Control</span>
                                <span className={styles.specValue}>Pneumatic</span>
                            </div>
                            <div className={styles.specItem}>
                                <span className={styles.specLabel}>Response</span>
                                <span className={styles.specValue}>&lt; 3s</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default EquipmentDetailsTab;
