#!/bin/bash
# Migrate test files from 0-based to 1-based addressing
for file in "$@"; do
  echo "Migrating $file..."
  # For columns 0-9
  for old_row in {29..0}; do
    new_row=$((old_row + 1))
    for old_col in {29..0}; do
      new_col=$((old_col + 1))
      sed -i "s/{ row: $old_row, col: $old_col }/{ row: $new_row, col: $new_col }/g" "$file"
    done
  done
done
