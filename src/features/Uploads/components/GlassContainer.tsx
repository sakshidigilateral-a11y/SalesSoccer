// components/GlassContainer.tsx
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export const GlassContainer: React.FC<ViewProps> = ({ children, style }) => {
  return (
    <View style={[styles.outerBorder, style]}>
      <View style={styles.innerContent}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerBorder: {
    borderRadius: 20,
    padding: 1, // This creates the thin "glass" border line
    backgroundColor: 'rgba(255, 255, 255, 0.3)', 
  },
  innerContent: {
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glass fill
    overflow: 'hidden',
  },
});