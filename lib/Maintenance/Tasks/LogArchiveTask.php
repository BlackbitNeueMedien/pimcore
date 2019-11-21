<?php
/**
 * Pimcore
 *
 * This source file is available under two different licenses:
 * - GNU General Public License version 3 (GPLv3)
 * - Pimcore Enterprise License (PEL)
 * Full copyright and license information is available in
 * LICENSE.md which is distributed with this source code.
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */

namespace Pimcore\Maintenance\Tasks;

use Pimcore\Config;
use Pimcore\Db;
use Pimcore\Log\Handler\ApplicationLoggerDb;
use Pimcore\Maintenance\TaskInterface;

final class LogArchiveTask implements TaskInterface
{
    /**
     * @var Db\ConnectionInterface
     */
    private $db;

    /**
     * @param Db\ConnectionInterface $db
     */
    public function __construct(Db\ConnectionInterface $db)
    {
        $this->db = $db;
    }

    /**
     * {@inheritdoc}
     */
    public function execute()
    {
        $conf = Config::getSystemConfig();
        $config = $conf->applicationlog;

        $db = $this->db;

        $date = new \DateTime('now');
        $tablename = ApplicationLoggerDb::TABLE_ARCHIVE_PREFIX.'_'.$date->format('m').'_'.$date->format('Y');

        if ($config->archive_alternative_database) {
            $tablename = $db->quoteIdentifier($config->archive_alternative_database).'.'.$tablename;
        }

        $archive_treshold = (int)$config->archive_treshold ?: 30;

        $timestamp = time();
        $sql = ' SELECT %s FROM '.ApplicationLoggerDb::TABLE_NAME.' WHERE `timestamp` < DATE_SUB(FROM_UNIXTIME('.$timestamp.'), INTERVAL '.$archive_treshold.' DAY)';

        if ($db->fetchOne(sprintf($sql, 'COUNT(*)')) > 1 || true) {
            $db->query('CREATE TABLE IF NOT EXISTS '.$tablename." (
                       id BIGINT(20) NOT NULL,
                       `pid` INT(11) NULL DEFAULT NULL,
                       `timestamp` DATETIME NOT NULL,
                       message VARCHAR(1024),
                       `priority` ENUM('emergency','alert','critical','error','warning','notice','info','debug') DEFAULT NULL,
                       fileobject VARCHAR(1024),
                       info VARCHAR(1024),
                       component VARCHAR(255),
                       source VARCHAR(255) NULL DEFAULT NULL,
                       relatedobject BIGINT(20),
                       relatedobjecttype ENUM('object', 'document', 'asset'),
                       maintenanceChecked TINYINT(4)
                    ) ENGINE = ARCHIVE ROW_FORMAT = DEFAULT;");

            $db->query('INSERT INTO '.$tablename.' '.sprintf($sql, '*'));
            $db->query('DELETE FROM '.ApplicationLoggerDb::TABLE_NAME.' WHERE `timestamp` < DATE_SUB(FROM_UNIXTIME('.$timestamp.'), INTERVAL '.$archive_treshold.' DAY);');
        }
    }
}
