import React from 'react';
import PropTypes from 'prop-types';
import { IconButton } from '@material-ui/core';
import {
  FirstPage,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from '@material-ui/icons';

/**
 * This is mostly copied over directly from the Material UI internal component so I could add the
 * first page button below.  I didn't modify any of the formatting they used.
 */
const TablePaginationActionsWithFirstPage = React.forwardRef(
  // eslint-disable-next-line prefer-arrow-callback
  function TablePaginationActionsWithFirstPage(props, ref) {
    const {
      backIconButtonProps,
      count,
      nextIconButtonProps,
      onChangePage,
      page,
      rowsPerPage,
      ...other
    } = props;
    const handleBackButtonClick = event => {
      onChangePage(event, page - 1);
    };

    const handleNextButtonClick = event => {
      onChangePage(event, page + 1);
    };

    const handleFirstPageClick = event => {
      onChangePage(event, 0);
    };

    return (
      <div ref={ref} {...other}>
        <IconButton
          onClick={handleFirstPageClick}
          disabled={page === 0}
          color="inherit"
          {...backIconButtonProps}
        >
          <FirstPage />
        </IconButton>
        <IconButton
          onClick={handleBackButtonClick}
          disabled={page === 0}
          color="inherit"
          {...backIconButtonProps}
        >
          <KeyboardArrowLeft />
        </IconButton>
        <IconButton
          onClick={handleNextButtonClick}
          disabled={page >= Math.ceil(count / rowsPerPage) - 1}
          color="inherit"
          {...nextIconButtonProps}
        >
          <KeyboardArrowRight />
        </IconButton>
      </div>
    );
  }
);

TablePaginationActionsWithFirstPage.propTypes = {
  /**
   * Props applied to the back arrow `IconButton` element.
   */
  backIconButtonProps: PropTypes.object,
  /**
   * The total number of rows.
   */
  count: PropTypes.number.isRequired,
  /**
   * Props applied to the next arrow `IconButton` element.
   */
  nextIconButtonProps: PropTypes.object,
  /**
   * Callback fired when the page is changed.
   *
   * @param {object} event The event source of the callback
   * @param {number} page The page selected
   */
  onChangePage: PropTypes.func.isRequired,
  /**
   * The zero-based index of the current page.
   */
  page: PropTypes.number.isRequired,
  /**
   * The number of rows per page.
   */
  rowsPerPage: PropTypes.number.isRequired,
};

export default TablePaginationActionsWithFirstPage;
