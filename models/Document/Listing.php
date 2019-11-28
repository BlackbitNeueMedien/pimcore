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
 * @category   Pimcore
 * @package    Document
 *
 * @copyright  Copyright (c) Pimcore GmbH (http://www.pimcore.org)
 * @license    http://www.pimcore.org/license     GPLv3 and PEL
 */

namespace Pimcore\Model\Document;

use Pimcore\Model;
use Pimcore\Model\Document;
use Zend\Paginator\Adapter\AdapterInterface;
use Zend\Paginator\AdapterAggregateInterface;

/**
 * @method Document[] load()
 * @method int getTotalCount()
 * @method int getCount()
 * @method int[] loadIdList()
 * @method \Pimcore\Model\Document\Listing\Dao getDao()
 * @method onCreateQuery(callable $callback)
 */
class Listing extends Model\Listing\AbstractListing implements AdapterInterface, AdapterAggregateInterface
{
    /**
     * Return all documents as Type Document. eg. for trees an so on there isn't the whole data required
     *
     * @var bool
     */
    public $objectTypeDocument = false;

    /**
     * @var array|null
     */
    protected $documents = null;

    /**
     * @var bool
     */
    public $unpublished = false;

    public function __construct()
    {
        $this->documents =& $this->data;
    }

    /**
     * @return Document[]
     */
    public function getDocuments()
    {
        return $this->getData();
    }

    /**
     * @param array $documents
     *
     * @return Listing
     */
    public function setDocuments($documents)
    {
        return $this->setData($documents);
    }

    /**
     * Checks if the document is unpublished.
     *
     * @return bool
     */
    public function getUnpublished()
    {
        return $this->unpublished;
    }

    /**
     * Set the unpublished flag for the document.
     *
     * @param $unpublished
     *
     * @return bool
     */
    public function setUnpublished($unpublished)
    {
        $this->unpublished = (bool) $unpublished;

        return $this;
    }

    /**
     * Returns the SQL condition value.
     *
     * @return string
     */
    public function getCondition()
    {
        $condition = parent::getCondition();

        if ($condition) {
            if (Document::doHideUnpublished() && !$this->getUnpublished()) {
                $condition = ' (' . $condition . ') AND published = 1';
            }
        } elseif (Document::doHideUnpublished() && !$this->getUnpublished()) {
            $condition = 'published = 1';
        }

        return $condition;
    }

    /**
     *
     * Methods for AdapterInterface
     */

    /**
     * Returns the total items count.
     *
     * @return int
     */
    public function count()
    {
        return $this->getTotalCount();
    }

    /**
     * Returns the listing based on defined offset and limit as parameters.
     *
     * @param int $offset
     * @param int $itemCountPerPage
     *
     * @return Listing
     */
    public function getItems($offset, $itemCountPerPage)
    {
        $this->setOffset($offset);
        $this->setLimit($itemCountPerPage);

        return $this->load();
    }

    /**
     * @return Listing
     */
    public function getPaginatorAdapter()
    {
        return $this;
    }
}
