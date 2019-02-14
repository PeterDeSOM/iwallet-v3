// Copyright (c) 2019 The Crypblorm Som32
// Use of this source code is governed by an ISC
// license that can be found in the LICENSE file.

package btcjson

// DecodePsbtResult models the data from the decodepsbt command.
type DecodePsbtResult struct {
	Tx      Psbtx       `json:"tx"`
	Unknown interface{} `json:"unknown"`
	Inputs  []Input     `json:"inputs"`
	Outputs []Output    `json:"outputs"`
	Fee     float64     `json:"fee"`
}

// Psbtx models the transaction to be pushed to network.
type Psbtx struct {
	Txid     string `json:"txid"`
	Hash     string `json:"hash,omitempty"`
	Version  int32  `json:"version"`
	Size     int32  `json:"size,omitempty"`
	Vsize    int32  `json:"vsize,omitempty"`
	Weight   int32  `json:"weight,omitempty"`
	LockTime uint32 `json:"locktime"`
	Vin      []Vin  `json:"vin"`
	Vout     []Vout `json:"vout"`
}

// Input models the transaction to be pushed to network.
type Input struct {
	WitnessUtxo   WitnessUtxo  `json:"witness_utxo,omitempty"`
	Signatures    *interface{} `json:"partial_signatures,omitempty"`
	Sighash       string       `json:"sighash,omitempty"`
	RedeemScript  ScriptBase   `json:"redeem_script,omitempty"`
	WitnessScript ScriptBase   `json:"witness_script,omitempty"`
}

// ScriptPubKey models the scriptPubKey data of a tx script.  It is
// defined separately since it is used by multiple commands.
type ScriptPubKey struct {
	Asm     string `json:"asm"`
	Hex     string `json:"hex"`
	Type    string `json:"type"`
	Address string `json:"address"`
}

// WitnessUtxo models the transaction to be pushed to network.
type WitnessUtxo struct {
	Amount       float64      `json:"amount"`
	ScriptPubKey ScriptPubKey `json:"scriptPubKey"`
}

// ScriptBase models the transaction to be pushed to network.
type ScriptBase struct {
	Asm  string `json:"asm,omitempty"`
	Hex  string `json:"hex,omitempty"`
	Type string `json:"type,omitempty"`
}

// Output models the transaction to be pushed to network.
type Output struct {
	RedeemScript  *ScriptBase `json:"redeem_script,omitempty"`
	WitnessScript *ScriptBase `json:"witness_script,omitempty"`
}
