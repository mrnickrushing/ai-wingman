import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  onBack: () => void;
  onStartMode: (modeId: string) => void;
}

export function PracticeScreen({ onBack }: Props) {
  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Practice</Text>
        </View>
        <View style={s.body}>
          <Text style={s.soon}>▶</Text>
          <Text style={s.label}>Coming Soon</Text>
          <Text style={s.sub}>AI-powered practice drills will appear here.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  back: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  title: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  soon: { fontSize: 48, opacity: 0.3 },
  label: { color: '#475569', fontSize: 16, fontWeight: '700' },
  sub: { color: '#334155', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
