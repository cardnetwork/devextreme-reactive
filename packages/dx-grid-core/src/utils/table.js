import { querySelectorAll } from './dom-utils';

const getTableKeyGetter = (getIntrinsicKey, object, index) => {
  const type = object.type || 'data';
  const intrinsicKey = type === 'data' ? getIntrinsicKey(object) : object.id;
  const key = intrinsicKey === undefined ? `$${index}` : intrinsicKey;
  return `${type}_${key}`;
};

export const tableRowKeyGetter = getTableKeyGetter;

const getColumnId = column => column.name;
export const tableColumnKeyGetter = (column, columnIndex) =>
  getTableKeyGetter(getColumnId, column, columnIndex);

export const getTableCellInfo = ({ row, columnIndex, columns }) => {
  if (row.colspan !== undefined && columnIndex > row.colspan) return { skip: true };
  if (row.colspan === columnIndex) return { colspan: columns.length - row.colspan };
  return {};
};

export const findTableCellTarget = (e) => {
  const { target, currentTarget } = e;

  const rowsEls = querySelectorAll(currentTarget, ':scope > tr, :scope > tr');
  const rowIndex = [...rowsEls].findIndex(rowEl => rowEl.contains(target));
  if (rowIndex === -1) return { rowIndex: -1, columnIndex: -1 };
  const cellEls = querySelectorAll(rowsEls[rowIndex], ':scope > th, :scope > td');
  const columnIndex = [...cellEls].findIndex(cellEl => cellEl.contains(target));
  if (columnIndex === -1) return { rowIndex: -1, columnIndex: -1 };

  return { rowIndex, columnIndex };
};

export const getTableColumnGeometries = (columns, tableWidth) => {
  const columnWidths = columns
    .map(column => column.width);

  const freeSpace = tableWidth;
  const restrictedSpace = columnWidths
    .reduce((accum, width) => accum + (width || 0), 0);
  const freeSpacePortions = columnWidths
    .reduce((accum, width) => accum + (width === undefined ? 1 : 0), 0);
  const freeSpacePortion = (freeSpace - restrictedSpace) / freeSpacePortions;

  let lastRightPosition = 0;
  return columnWidths
    .map(width => (width === undefined ? freeSpacePortion : width))
    .map((width) => {
      lastRightPosition += width;
      return {
        left: lastRightPosition - width,
        right: lastRightPosition,
      };
    });
};

export const getTableTargetColumnIndex = (columnGeometries, sourceIndex, offset) => {
  const sourceWidth = columnGeometries[sourceIndex].right - columnGeometries[sourceIndex].left;
  const getWidthDifference = index =>
    columnGeometries[index].right - columnGeometries[index].left - sourceWidth;

  return columnGeometries
    .map(({ left, right }, targetIndex) => {
      let leftBorder = left;
      if (targetIndex > 0 && targetIndex <= sourceIndex) {
        leftBorder = Math.min(leftBorder, leftBorder - getWidthDifference(targetIndex - 1));
      }
      if (targetIndex > sourceIndex) {
        leftBorder = Math.max(leftBorder, leftBorder + getWidthDifference(targetIndex));
      }
      let rightBorder = right;
      if (targetIndex < columnGeometries.length - 1 && targetIndex >= sourceIndex) {
        rightBorder = Math.max(rightBorder, rightBorder + getWidthDifference(targetIndex + 1));
      }
      if (targetIndex < sourceIndex) {
        rightBorder = Math.min(rightBorder, rightBorder - getWidthDifference(targetIndex));
      }

      return {
        left: leftBorder,
        right: rightBorder,
      };
    })
    .findIndex(({ left, right }) => offset > left && offset < right);
};