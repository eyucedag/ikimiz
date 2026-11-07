import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize } from '@/src/constants/theme';

function inlineParts(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <Text key={index} style={styles.bold}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('*') && part.endsWith('*')) return <Text key={index} style={styles.italic}>{part.slice(1, -1)}</Text>;
    return <Text key={index}>{part}</Text>;
  });
}

export function NotebookBody({ body, numberOfLines }: { body: string; numberOfLines?: number }) {
  return <View>
    {body.split('\n').map((line, index) => {
      const bullet = /^\s*[-*]\s+/.test(line);
      return <Text key={index} numberOfLines={numberOfLines} style={styles.line}>
        {bullet ? <Text style={styles.bullet}>• </Text> : null}{inlineParts(bullet ? line.replace(/^\s*[-*]\s+/, '') : line)}
      </Text>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  line: { fontSize: fontSize.sm, lineHeight: 21, color: colors.text },
  bullet: { color: colors.textSecondary, fontWeight: '700' },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
});
